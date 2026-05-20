import { useMemo } from 'react';

const CELL_SIZE = 10;
const CELL_GAP = 2;
const MAX_VISIBLE = 500; // Cap visible cells for performance

export default function PacketGrid({ totalChunks = 0, receivedChunks = new Set(), errorChunks = new Set(), currentChunk = -1 }) {
  const visibleTotal = Math.min(totalChunks, MAX_VISIBLE);
  const scale = totalChunks > MAX_VISIBLE ? totalChunks / MAX_VISIBLE : 1;

  const cells = useMemo(() => {
    const result = [];
    for (let i = 0; i < visibleTotal; i++) {
      const actualIndex = Math.floor(i * scale);
      let status = 'pending';

      if (actualIndex === currentChunk) {
        status = 'active';
      } else if (errorChunks.has(actualIndex)) {
        status = 'error';
      } else if (receivedChunks.has(actualIndex)) {
        status = 'received';
      }

      result.push({ index: i, actualIndex, status });
    }
    return result;
  }, [visibleTotal, scale, receivedChunks, errorChunks, currentChunk]);

  // Calculate grid columns
  const containerWidth = 320;
  const cols = Math.floor(containerWidth / (CELL_SIZE + CELL_GAP));

  if (totalChunks === 0) return null;

  return (
    <div style={{
      width: '100%',
      padding: '12px',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
        fontSize: '0.65rem',
        fontFamily: 'var(--font-mono)',
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        <span>Packet Map</span>
        <span>{receivedChunks.size}/{totalChunks} chunks</span>
      </div>

      {/* Grid */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${CELL_GAP}px`,
        maxHeight: '120px',
        overflowY: 'auto',
        scrollbarWidth: 'thin',
      }}>
        {cells.map((cell) => (
          <div
            key={cell.index}
            className={cell.status === 'received' ? 'packet-cell-received' : ''}
            style={{
              width: `${CELL_SIZE}px`,
              height: `${CELL_SIZE}px`,
              borderRadius: '2px',
              background: getCellColor(cell.status),
              transition: 'background 0.2s ease',
              boxShadow: cell.status === 'active'
                ? '0 0 6px #3b82f6'
                : cell.status === 'error'
                ? '0 0 4px #ef444480'
                : 'none',
            }}
            title={`Chunk ${cell.actualIndex}: ${cell.status}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginTop: '8px',
        fontSize: '0.6rem',
        color: 'var(--color-text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        <LegendItem color="#22c55e" label="Received" />
        <LegendItem color="rgba(255,255,255,0.08)" label="Pending" />
        <LegendItem color="#ef4444" label="Error" />
        <LegendItem color="#3b82f6" label="Active" />
      </div>
    </div>
  );
}

function getCellColor(status) {
  switch (status) {
    case 'received': return '#22c55e';
    case 'error':    return '#ef4444';
    case 'active':   return '#3b82f6';
    default:         return 'rgba(255,255,255,0.08)';
  }
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '2px',
        background: color,
      }} />
      {label}
    </div>
  );
}
