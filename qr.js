"use strict";

function demoQr(value) {
  // Version 1-L, byte mode, mask 0. The payload is an ASCII demo invoice reference.
  const bytes = [...new TextEncoder().encode(value)];
  if (bytes.length > 17) throw new Error("QR payload exceeds version 1-L capacity");
  const bits = [];
  function append(number, length) {
    for (let bit = length - 1; bit >= 0; bit--) bits.push((number >>> bit) & 1);
  }
  append(4, 4);
  append(bytes.length, 8);
  for (const byte of bytes) append(byte, 8);
  append(0, Math.min(4, 152 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let index = 0; index < bits.length; index += 8) {
    data.push(bits.slice(index, index + 8).reduce((byte, bit) => (byte << 1) | bit, 0));
  }
  for (let pad = 0; data.length < 19; pad++) data.push(pad % 2 ? 0x11 : 0xec);

  function multiply(first, second) {
    let result = 0;
    for (; second; second >>>= 1) {
      if (second & 1) result ^= first;
      first = (first << 1) ^ (first & 128 ? 0x11d : 0);
    }
    return result;
  }

  const generator = [127, 122, 154, 164, 11, 68, 117];
  const remainder = Array(7).fill(0);
  for (const byte of data) {
    const factor = byte ^ remainder.shift();
    remainder.push(0);
    generator.forEach((coefficient, index) => { remainder[index] ^= multiply(coefficient, factor); });
  }
  bits.length = 0;
  for (const byte of [...data, ...remainder]) append(byte, 8);

  const size = 21;
  const matrix = Array.from({ length: size }, () => Array(size).fill(null));
  function set(x, y, bit) {
    if (x >= 0 && x < size && y >= 0 && y < size) matrix[y][x] = Number(bit);
  }
  for (const [cx, cy] of [[3, 3], [17, 3], [3, 17]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const distance = Math.max(Math.abs(dx), Math.abs(dy));
        set(cx + dx, cy + dy, distance !== 2 && distance !== 4);
      }
    }
  }
  for (let position = 8; position <= 12; position++) {
    set(6, position, position % 2 === 0);
    set(position, 6, position % 2 === 0);
  }
  const format = position => (0x77c4 >>> position) & 1;
  for (let index = 0; index <= 5; index++) set(8, index, format(index));
  set(8, 7, format(6));
  set(8, 8, format(7));
  set(7, 8, format(8));
  for (let index = 9; index < 15; index++) set(14 - index, 8, format(index));
  for (let index = 0; index < 8; index++) set(20 - index, 8, format(index));
  for (let index = 8; index < 15; index++) set(8, 6 + index, format(index));
  set(8, 13, 1);

  let index = 0;
  for (let right = 20; right > 0; right -= 2) {
    if (right === 6) right = 5;
    for (let row = 0; row < size; row++) {
      const y = ((right + 1) & 2) === 0 ? 20 - row : row;
      for (let column = 0; column < 2; column++) {
        const x = right - column;
        if (matrix[y][x] === null) set(x, y, bits[index++] ^ Number((x + y) % 2 === 0));
      }
    }
  }
  const path = matrix.flatMap((row, y) => row.map((bit, x) => bit ? `M${x + 4} ${y + 4}h1v1h-1z` : "")).join("");
  return `<svg class="qr" role="img" aria-label="QR สำหรับการชำระเงินจำลอง" viewBox="0 0 29 29" shape-rendering="crispEdges"><rect width="29" height="29" fill="white"/><path d="${path}" fill="#191919"/></svg>`;
}

