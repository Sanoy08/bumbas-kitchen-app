const fs = require('fs');
const path = require('path');

function rgbToHsl(r, g, b) {
    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
        h = s = 0; 
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l; 
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        let p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [r, g, b];
}

function changeColor(obj) {
  if (Array.isArray(obj)) {
    if (obj.length === 4 && obj.every(n => typeof n === 'number' && n >= 0 && n <= 1)) {
      const [r, g, b, a] = obj;
      // Change blueish colors
      if (b > r || g > r) {
        // Convert to HSL, set Hue to ~347 degrees (pink), convert back
        let [h, s, l] = rgbToHsl(r, g, b);
        let [nr, ng, nb] = hslToRgb(0.964, s, l); // 347/360
        return [Number(nr.toFixed(3)), Number(ng.toFixed(3)), Number(nb.toFixed(3)), a];
      }
    }
    return obj.map(changeColor);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (key === 'c' && obj[key].k) {
        if (Array.isArray(obj[key].k) && obj[key].k.length === 4 && typeof obj[key].k[0] === 'number') {
          const [r, g, b, a] = obj[key].k;
          if (b > r || g > r) {
             let [h, s, l] = rgbToHsl(r, g, b);
             let [nr, ng, nb] = hslToRgb(0.964, s, l);
             newObj[key] = { ...obj[key], k: [Number(nr.toFixed(3)), Number(ng.toFixed(3)), Number(nb.toFixed(3)), a] };
             continue;
          }
        }
      }
      newObj[key] = changeColor(obj[key]);
    }
    return newObj;
  }
  return obj;
}

const filePath = path.join(__dirname, '../assets/animations/Maintenance web.json');
try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    const updated = changeColor(json);
    fs.writeFileSync(filePath, JSON.stringify(updated));
    console.log('Successfully updated Lottie colors to pink shade.');
} catch (e) {
    console.error('Error:', e);
}
