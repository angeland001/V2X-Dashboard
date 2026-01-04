import React from 'react';

const PulseIcon = ({
  size = undefined,
  color = '#faff00',
  strokeWidth = 2,
  background = 'transparent',
  opacity = 1,
  rotation = 0,
  shadow = 3,
  flipHorizontal = false,
  flipVertical = false,
  padding = 0
}) => {
  const transforms = [];
  if (rotation !== 0) transforms.push(`rotate(${rotation}deg)`);
  if (flipHorizontal) transforms.push('scaleX(-1)');
  if (flipVertical) transforms.push('scaleY(-1)');

  const viewBoxSize = 24 + (padding * 2);
  const viewBoxOffset = -padding;
  const viewBox = `${viewBoxOffset} ${viewBoxOffset} ${viewBoxSize} ${viewBoxSize}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        opacity,
        transform: transforms.join(' ') || undefined,
        filter: shadow > 0 ? `drop-shadow(0 ${shadow}px ${shadow * 2}px rgba(0,0,0,0.3))` : undefined,
        backgroundColor: background !== 'transparent' ? background : undefined
      }}
    >
      <circle cx="12" cy="12" r="0" fill="currentColor">
        <animate
          attributeName="r"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          repeatCount="indefinite"
          values="0;11"
        />
        <animate
          attributeName="opacity"
          calcMode="spline"
          dur="1.2s"
          keySplines=".52,.6,.25,.99"
          repeatCount="indefinite"
          values="1;0"
        />
      </circle>
    </svg>
  );
};

export default PulseIcon;
