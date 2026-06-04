import { useState, useEffect } from 'react';
import { isTauri } from '../utils/fileManager';

interface PdfViewerProps {
  filePath: string;
  fileName: string;
}

export default function PdfViewer({ filePath, fileName }: PdfViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let revoke: (() => void) | null = null;

    async function loadPdf() {
      setLoading(true);
      setError(null);

      try {
        if (isTauri()) {
          // Read PDF as binary bytes via Tauri's fs plugin
          const { readFile } = await import('@tauri-apps/plugin-fs');
          const bytes = await readFile(filePath);

          // Create a blob URL from the binary data
          const blob = new Blob([bytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          revoke = () => URL.revokeObjectURL(url);
        } else {
          setError('PDF viewer is only available in the desktop app.');
        }
      } catch (err) {
        console.error('Failed to load PDF:', err);
        setError('PDF ဖိုင်ကို ဖွင့်၍မရပါ');
      } finally {
        setLoading(false);
      }
    }

    loadPdf();

    return () => {
      if (revoke) revoke();
    };
  }, [filePath]);

  if (loading) {
    return (
      <div className="editor-container">
        <div className="empty-state fade-in">
          <div className="empty-state-icon">⏳</div>
          <p className="empty-state-text">PDF ဖိုင် ဖွင့်နေပါသည်...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="editor-container">
        <div className="empty-state fade-in">
          <div className="empty-state-icon">📄</div>
          <p className="empty-state-text">
            <strong>{fileName}</strong>
          </p>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--font-size-sm)' }}>
            {error || 'PDF ဖိုင်ကို ဖွင့်၍မရပါ'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pdf-viewer-container">
      <iframe
        src={pdfUrl}
        className="pdf-viewer-iframe"
        title={fileName}
      />
    </div>
  );
}
