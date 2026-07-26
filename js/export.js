export function composeImageFilename(project) {
    const range = project.dataset.request.dateRange;
    return `tempstitch-${range.start}-to-${range.end}.png`;
}

export function composeInstructionsText(project) {
    return [
        'TempStitch Pattern',
        '==================',
        '',
        `Craft: ${project.settings.craftType === 'knit' ? 'Knitting' : 'Crochet'}`,
        `Stitches per row: ${project.settings.stitchCount}`,
        `Colours: ${project.settings.numColours}`,
        '',
        'Colour Key',
        '----------',
        ...project.design.colourKey.map(e => `C${e.index} ${e.name}: ${e.label}`),
        '',
        'Instructions',
        '------------',
        ...project.pattern.instructions,
    ].join('\n');
}

export function downloadImage(project) {
    const stitchWidth = 8;
    const rowHeight = 4;
    const padding = 40;
    const keyHeight = 30;
    const headerHeight = 60;

    const width = project.settings.stitchCount * stitchWidth + padding * 2;
    const height = headerHeight + project.pattern.rows.length * rowHeight + keyHeight + padding * 2;

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
    const range = project.dataset.request.dateRange;
    ctx.fillText(`${range.start} to ${range.end}  |  ${project.settings.stitchCount} stitches/row`, width / 2, 42);

    let y = headerHeight;
    project.pattern.rows.forEach(row => {
        for (let s = 0; s < row.stitches; s++) {
            ctx.fillStyle = row.colour;
            ctx.fillRect(padding + s * stitchWidth, y, stitchWidth - 1, rowHeight - 1);
        }
        y += rowHeight;
    });

    const keyY = y + 10;
    const blockWidth = (width - padding * 2) / project.design.colourKey.length;
    project.design.colourKey.forEach((entry, i) => {
        ctx.fillStyle = entry.colour;
        ctx.fillRect(padding + i * blockWidth, keyY, blockWidth, 12);
    });

    ctx.fillStyle = '#78716c';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${project.design.min}°`, padding, keyY + 24);
    ctx.textAlign = 'right';
    ctx.fillText(`${project.design.max}°`, width - padding, keyY + 24);

    const link = document.createElement('a');
    link.download = composeImageFilename(project);
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function downloadInstructions(project) {
    const blob = new Blob([composeInstructionsText(project)], { type: 'text/plain' });
    const link = document.createElement('a');
    link.download = 'tempstitch-pattern.txt';
    link.href = URL.createObjectURL(blob);
    link.click();
    URL.revokeObjectURL(link.href);
}
