const fs = require('fs');
const path = require('path');

const targetColor = [0.882, 0.114, 0.282, 1]; // Bumba's Pink

function changeColor(obj) {
  if (Array.isArray(obj)) {
    if (obj.length === 4 && obj.every(n => typeof n === 'number' && n >= 0 && n <= 1)) {
      const [r, g, b, a] = obj;
      // Change any bluish or greenish color to the pink target color
      if (b > r || g > r) {
        return [...targetColor];
      }
    }
    return obj.map(changeColor);
  } else if (obj !== null && typeof obj === 'object') {
    const newObj = {};
    for (const key in obj) {
      if (key === 'c' && obj[key].k) {
        // Handle color array inside 'c.k' directly
        if (Array.isArray(obj[key].k) && obj[key].k.length === 4 && typeof obj[key].k[0] === 'number') {
          const [r, g, b, a] = obj[key].k;
          if (b > r || g > r) {
             newObj[key] = { ...obj[key], k: [...targetColor] };
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

const filePath = path.join('c:/Users/gamin/Videos/bumbas-kitchen-app/assets/animations/empty-cart.json');
try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    const updated = changeColor(json);
    fs.writeFileSync(filePath, JSON.stringify(updated));
    console.log('Successfully updated Lottie colors.');
} catch (e) {
    console.error('Error:', e);
}
