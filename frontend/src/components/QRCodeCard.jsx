import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function QRCodeCard({ value, title = 'Código QR' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!value || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, value, {
      width: 220,
      margin: 1
    });
  }, [value]);

  const download = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${Date.now()}.png`;
    a.click();
  };

  return (
    <div className="qr-card">
      <h4>{title}</h4>
      <canvas ref={canvasRef} />
      <small>{value}</small>
      <button type="button" onClick={download}>
        Descargar PNG
      </button>
    </div>
  );
}
