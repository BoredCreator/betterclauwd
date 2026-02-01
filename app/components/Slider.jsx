"use client"

import RcSlider from 'rc-slider'
import 'rc-slider/assets/index.css'
import styles from './Slider.module.css'

export default function Slider({ value, onChange, min = 0, max = 100, step = 1 }) {
  return (
    <div className={styles.sliderWrapper}>
      <RcSlider
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        step={step}
        styles={{
          track: {
            backgroundColor: '#22c55e',
            height: 6,
          },
          rail: {
            backgroundColor: 'var(--border)',
            height: 6,
          },
          handle: {
            backgroundColor: 'var(--text)',
            borderColor: 'var(--text)',
            height: 18,
            width: 18,
            marginTop: -6,
            opacity: 1,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          },
        }}
      />
    </div>
  )
}
