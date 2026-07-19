import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, {
  Path,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  G,
  Circle,
  Filter,
  FeDropShadow,
  Mask,
  Rect,
} from 'react-native-svg';

export interface CouponTagProps {
  width?: number | string;
  height?: number | string;
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  showHangingRing?: boolean;
  offsetLayer?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const CouponTag: React.FC<CouponTagProps> = ({
  width = '100%',
  height = '100%',
  fillColor = '#FFFFFF',
  borderColor = '#18B7FF',
  borderWidth = 8,
  showHangingRing = false,
  offsetLayer = false,
  style,
  children,
}) => {
  // SVG Canvas dimensions
  const viewBoxWidth = 300;
  const viewBoxHeight = 405; // ~1.35x width

  // Path for the coupon shape matching the user's image
  // Polygonal top (slanted shoulders, flat top), perfectly straight sides, sharp V-notches in center, bowed bottom.
  const ticketPath = `
    M 135 15
    L 165 15
    Q 175 15, 185 20
    L 265 70
    Q 280 80, 280 100
    L 280 180
    L 265 188
    A 2 2 0 0 0 265 192
    L 280 200
    L 280 340
    A 20 20 0 0 1 260 360
    Q 150 375, 40 360
    A 20 20 0 0 1 20 340
    L 20 200
    L 35 192
    A 2 2 0 0 0 35 188
    L 20 180
    L 20 100
    Q 20 80, 35 70
    L 115 20
    Q 125 15, 135 15
    Z 
  `;

  return (
    <View style={[{ width, height, aspectRatio: 300 / 405 }, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} style={{ position: 'absolute' }}>
        <Defs>
          {/* Subtle Radial Pink Gradient for the front tag */}
          <RadialGradient id="frontGradient" cx="50%" cy="50%" r="75%">
            <Stop offset="0%" stopColor="#FFFFFF" />
            <Stop offset="50%" stopColor="#FFF1F2" />
            <Stop offset="100%" stopColor="#FFE4E6" />
          </RadialGradient>
          
          {/* Mask to punch a perfect cylinder hole through ALL stacked layers */}
          <Mask id="holeMask">
            <Rect x="0" y="0" width="100%" height="100%" fill="white" />
            <Circle cx="150" cy="46" r="14" fill="black" />
          </Mask>
        </Defs>

        {/* Back Half of the Ring (Visible through the hole and above the left side) */}
        {showHangingRing && (
          <G>
            {/* Left side of the ring (drawn behind the ticket) */}
            <Path 
              d="M 150 50 A 20 20 0 0 1 150 10" 
              fill="none" 
              stroke="#0f172a" 
              strokeWidth="8" 
            />
            {/* Inner highlight for metallic shine */}
            <Path 
              d="M 150 50 A 20 20 0 0 1 150 10" 
              fill="none" 
              stroke="#475569" 
              strokeWidth="3" 
            />
          </G>
        )}

        {/* Group containing all ticket layers, masked by the hole */}
        <G mask="url(#holeMask)">
          <G transform={offsetLayer ? "translate(12, 10)" : undefined}>
            {/* Main Ticket Body */}
            <Path
              d={ticketPath}
              fill={fillColor === '#FFFFFF' ? "url(#frontGradient)" : fillColor}
              stroke={borderColor}
              strokeWidth={borderWidth}
              strokeLinejoin="round"
            />
          </G>
        </G>

        {/* Front Half of the Ring (Visible overlapping the right side of the ticket) */}
        {showHangingRing && !offsetLayer && (
          <G>
            {/* Right side of the ring (drawn in front of the ticket) */}
            <Path 
              d="M 150 10 A 20 20 0 0 1 150 50" 
              fill="none" 
              stroke="#0f172a" 
              strokeWidth="8" 
            />
            <Path 
              d="M 150 10 A 20 20 0 0 1 150 50" 
              fill="none" 
              stroke="#475569" 
              strokeWidth="3" 
            />
          </G>
        )}

      </Svg>

      {/* Content Container */}
      <View style={{ flex: 1, paddingHorizontal: 30, paddingTop: 55, paddingBottom: 25 }}>
        {children}
      </View>
    </View>
  );
};
