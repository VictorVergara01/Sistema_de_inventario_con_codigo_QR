import { useMemo, useRef, useState } from 'react';
import QrReader from 'react-qr-scanner';
import api from '../lib/api';

const DUPLICATE_SCAN_WINDOW_MS = 1500;

const extractQrValue = (payload) => {
  if (!payload) return '';

  if (typeof payload === 'string') {
    return payload.trim();
  }

  if (typeof payload.text === 'string') {
    return payload.text.trim();
  }

  if (typeof payload.data === 'string') {
    return payload.data.trim();
  }

  if (payload.result && typeof payload.result.text === 'string') {
    return payload.result.text.trim();
  }

  return '';
};

export default function ScannerPage() {
  const [scanValue, setScanValue] = useState('');
  const [product, setProduct] = useState(null);
  const [error, setError] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [lastSource, setLastSource] = useState('camera');
  const [scanCount, setScanCount] = useState(0);

  const lastProcessedRef = useRef({ value: '', timestamp: 0 });

  const resolveProduct = async (rawValue, { source = 'camera', force = false } = {}) => {
    const value = String(rawValue || '').trim();
    if (!value) return;

    const now = Date.now();
    const isDuplicateInWindow =
      value === lastProcessedRef.current.value &&
      now - lastProcessedRef.current.timestamp < DUPLICATE_SCAN_WINDOW_MS;

    if (!force && (isResolving || isDuplicateInWindow)) {
      return;
    }

    lastProcessedRef.current = { value, timestamp: now };

    setError('');
    setIsResolving(true);
    try {
      const { data } = await api.get(`/products/by-qr?value=${encodeURIComponent(value)}`);
      setProduct(data);
      setScanValue(value);
      setLastSource(source);
      setScanCount((prev) => prev + 1);
    } catch {
      setError('QR no encontrado. Puedes intentar por SKU manualmente.');
    } finally {
      setIsResolving(false);
    }
  };

  const handleScan = async (data) => {
    const value = extractQrValue(data);
    if (!value) return;
    await resolveProduct(value, { source: 'camera' });
  };

  const handleError = () => {
    setError('No fue posible acceder a la cámara.');
  };

  const handleManualSubmit = async (event) => {
    event.preventDefault();
    await resolveProduct(manualValue, { source: 'manual', force: true });
  };

  const resetScannerState = () => {
    setProduct(null);
    setError('');
    setScanValue('');
    setManualValue('');
    lastProcessedRef.current = { value: '', timestamp: 0 };
  };

  const scannerHint = useMemo(() => {
    if (isResolving) return 'Procesando lectura...';
    if (error) return 'Lectura con error. Acerca otro QR o usa ingreso manual.';
    if (product) return 'Lectura exitosa. Ya puedes escanear otro código.';
    return 'Apunta la cámara al QR y espera confirmación.';
  }, [isResolving, error, product]);

  return (
    <section>
      <h1>Lector QR</h1>
      <p>Escanea un producto para ver su ficha completa o registrar movimiento.</p>

      <div className="grid-two">
        <div className="card scanner-card">
          <QrReader
            delay={250}
            style={{ width: '100%' }}
            onError={handleError}
            onScan={handleScan}
            constraints={{ video: { facingMode: 'environment' } }}
          />

          <div className="scanner-status">
            <small>{scannerHint}</small>
            <small>
              Lecturas válidas: <strong>{scanCount}</strong>
            </small>
          </div>

          <form className="row-actions" onSubmit={handleManualSubmit}>
            <input
              placeholder="Pegar valor QR manual"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
            />
            <button type="submit" className="ghost" disabled={isResolving || !manualValue.trim()}>
              Buscar
            </button>
            <button type="button" onClick={resetScannerState}>
              Limpiar
            </button>
          </form>

          <div className="scanner-meta">
            <small>Último origen: {lastSource === 'manual' ? 'Manual' : 'Cámara'}</small>
            {scanValue && (
              <small>
                Último QR: <code>{scanValue}</code>
              </small>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Resultado</h3>
          {error && <div className="error">{error}</div>}
          {!product ? (
            <p>Esperando escaneo...</p>
          ) : (
            <div className="scanner-result">
              <p>
                <strong>{product.name}</strong>
              </p>
              <p>SKU: {product.sku}</p>
              <p>Stock actual: {product.stockCurrent}</p>
              <p>Stock mínimo: {product.stockMin}</p>
              <p>Ubicación: {product.warehouseLocation || product.Location?.name || '-'}</p>
              <p>Proveedor: {product.Supplier?.name || '-'}</p>
              <p>Categoría: {product.Category?.name || '-'}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
