import { getDateRange } from './weather.js';

export function downloadImage(pattern) {
    const stitchWidth = 8;
    const rowHeight = 4;
    const padding = 40;
    const keyHeight = 30;
    const headerHeight = 60;

    const width = pattern.options.stitchCount * stitchWidth + padding * 2;
    const height = headerHeight + pattern.rows.length * rowHeight + keyHeight + padding * 2;

    const canvas = document.createElement('canvas');
    canvas.width = width * 2;
    canvas.height = height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TempStitch Design', width / 2, 25);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#78716c';
    const range = getDateRange();
    ctx.fillText(`${range.start} to ${range.end}  |  ${pattern.options.stitchCount} stitches/row`, width / 2, 42);

    let y = headerHeight;
    pattern.rows.forEach(row => {
        for (let s = 0; s < row.stitches; s++) {
            ctx.fillStyle = row.colour;
            ctx.fillRect(padding + s * stitchWidth, y, stitchWidth - 1, rowHeight - 1);
        }
        y += rowHeight;
    });

    const keyY = y + 10;
    const blockWidth = (width - padding * 2) / pattern.colourKey.length;
    pattern.colourKey.forEach((entry, i) => {
        ctx.fillStyle = entry.colour;
        ctx.fillRect(padding + i * blockWidth, keyY, blockWidth, 12);
    });

    ctx.fillStyle = '#78716c';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${pattern.options.min}°`, padding, keyY + 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${pattern.options.max}°`, width - padding, keyY + 24);

    const link = document.createElement('a');
    link.download = `tempstitch-${range.start}-to-${range.end}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function downloadInstructions(pattern) {
    const lines = [
        'TempStitch Pattern',
        '==================',
        '',
        `Craft: ${pattern.options.craftType === 'knit' ? 'Knitting' : 'Crochet'}`,
        `Stitches per row: ${pattern.options.stitchCount}`,
        `Colours: ${pattern.options.numColours}`,
        '',
        'Colour Key',
        '----------',
        ...pattern.colourKey.map(e => `C${e.index} ${e.name}: ${e.label}`),
        '',
        'Instructions',
        '------------',
        ...pattern.instructions,
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = 'tempstitch-pattern.txt';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}
