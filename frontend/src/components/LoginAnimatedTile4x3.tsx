import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'

/* ==========================================
   CONFIG
========================================== */

const GRID_CONFIG = {
  ROWS: 3,
  COLS: 3,
  GAP: '12px',
}

const ANIMATION_CONFIG = {
  CYCLE_INTERVAL: 6000,
}

/* ==========================================
   GRADIENT POSITIONS (4x3 GRID)
========================================== */

const GRADIENT_CELLS = [
  { row: 0, col: 1 },
  { row: 1, col: 2 },
  { row: 2, col: 0 },
  { row: 3, col: 1 },
]

const GRADIENTS = [
  'radial-gradient(518% 676% at -313% 0%, #71E9DC 0%, #A681F1 50%, #F27968 100%)',
  'radial-gradient(516% 685% at -103% -106%, #71E9DC 0%, #A681F1 50%, #F27968 100%)',
  'radial-gradient(516% 679% at 0% -214%, #71E9DC 0%, #A681F1 50%, #F27968 100%)',
  'radial-gradient(515% 672% at -311% -208%, #71E9DC 0%, #A681F1 50%, #F27968 100%)',
]

const GRADIENT_LABELS = [
  { title: 'Discover', subtitle: 'Ad Inventory', icon: 'Hero-Discover.svg' },
  { title: 'Design', subtitle: 'Creative Ads', icon: 'Hero-Discover-1.svg' },
  { title: 'Book', subtitle: 'Campaign', icon: 'Hero-Book.svg' },
  { title: 'Measure', subtitle: 'Impact', icon: 'Hero-Measure.svg' },
]

/* ==========================================
   TYPES
========================================== */

interface Tile {
  row: number
  col: number
  imagePath: string
}

/* ==========================================
   COMPONENT
========================================== */

export default function LoginAnimatedTile4x3() {
  const [tiles, setTiles] = useState<Tile[]>([])
  const [images, setImages] = useState<string[]>([])

  /* 🔥 Auto load all tile images */
  useEffect(() => {
    const modules = import.meta.glob('../assets/tiles/*.{jpg,jpeg,png}', {
      eager: true,
      import: 'default',
    }) as Record<string, string>

    const loadedImages = Object.values(modules)
    setImages(loadedImages)

    const positions: Tile[] = []

    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        if (!GRADIENT_CELLS.some(g => g.row === r && g.col === c)) {
          positions.push({
            row: r,
            col: c,
            imagePath: loadedImages[positions.length % loadedImages.length],
          })
        }
      }
    }

    setTiles(positions)
  }, [])

  /* 🔄 Shuffle animation */
  const shuffle = useCallback(() => {
    if (!images.length) return

    const shuffled = [...images].sort(() => Math.random() - 0.5)

    setTiles(prev =>
      prev.map((tile, i) => ({
        ...tile,
        imagePath: shuffled[i % shuffled.length],
      }))
    )
  }, [images])

  useEffect(() => {
    const interval = setInterval(shuffle, ANIMATION_CONFIG.CYCLE_INTERVAL)
    return () => clearInterval(interval)
  }, [shuffle])

  /* 🧩 Render grid */

  const renderGrid = () => {
    const grid = []

    for (let r = 0; r < GRID_CONFIG.ROWS; r++) {
      for (let c = 0; c < GRID_CONFIG.COLS; c++) {
        const gradientCell = GRADIENT_CELLS.find(g => g.row === r && g.col === c)

        if (gradientCell) {
          const i = GRADIENT_CELLS.indexOf(gradientCell)
          const label = GRADIENT_LABELS[i]

          grid.push(
            <div
              key={`${r}-${c}`}
              className="tile-cell"
              style={{ background: GRADIENTS[i] }}
            >
              <div className="gradient-content">
                <img
                  src={new URL(`../assets/HeroIcons/${label.icon}`, import.meta.url).href}
                  className="gradient-icon"
                />
                <div className="gradient-title">{label.title}</div>
                <div className="gradient-sub">{label.subtitle}</div>
              </div>
            </div>
          )
        } else {
          const tile = tiles.find(t => t.row === r && t.col === c)

          grid.push(
            <div key={`${r}-${c}`} className="tile-cell image-tile">
              {tile && (
                <motion.img
                  key={tile.imagePath}
                  src={tile.imagePath}
                  className="tile-image"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8 }}
                />
              )}
            </div>
          )
        }
      }
    }

    return grid
  }

  return (
    <div className="animated-grid-container">
      <div
        className="tile-grid"
        style={{
          gridTemplateRows: `repeat(${GRID_CONFIG.ROWS}, 1fr)`,
          gridTemplateColumns: `repeat(${GRID_CONFIG.COLS}, 1fr)`,
          gap: GRID_CONFIG.GAP,
        }}
      >
        {renderGrid()}
      </div>

      <style>{`
        .animated-grid-container {
          width: 100%;
          height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          background: black;
          padding: 24px; /* changed: added padding */
        }

        .tile-grid {
          display: grid;
          width: 100%;  /* changed: was min(90vw, 420px) */
          height: 100%; /* changed: was aspect-ratio based */
        }

        .tile-cell {
          position: relative;
          padding-bottom: 100%;
          border-radius: 12px;
          overflow: hidden;
        }

        .tile-cell > * {
          position: absolute;
          inset: 0;
        }

        .gradient-content {
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 1.5rem;
          color: white;
        }

        .gradient-icon {
          width: 40px;
          margin-bottom: 0.7rem;
        }

        .gradient-title {
          font-size: 1.7rem;
          font-weight: 600;
        }

        .gradient-sub {
          opacity: 0.8;
        }

        .image-tile {
          background: #111;
        }

        .tile-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      `}</style>
    </div>
  )
}