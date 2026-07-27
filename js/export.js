const STITCH_WIDTH = 8;
const ROW_HEIGHT = 4;
const PADDING = 40;
const KEY_HEIGHT = 30;
const MIN_EXPORT_WIDTH = 480;

function temperatureUnitLabel(tempUnit) {
    return tempUnit === 'fahrenheit' ? 'Fahrenheit (°F)' : 'Celsius (°C)';
}

function heading(project, noun) {
    const { start, end } = project.dataset.request.dateRange;
    return `TempStitch ${noun} — ${start} to ${end}`;
}

function authorityMetadata(project) {
    const { location, dateRange, tempUnit } = project.dataset.request;
    const { latitude, longitude } = project.dataset.provenance;
    return [
        `Selected location: ${location.displayName}`,
        `Selected coordinates: ${location.lat}, ${location.lon}`,
        `Provider-resolved coordinates: ${latitude}, ${longitude}`,
        `Date range: ${dateRange.start} to ${dateRange.end}`,
        `Temperature unit: ${temperatureUnitLabel(tempUnit)}`,
        `Stitches per row: ${project.settings.stitchCount}`,
    ];
}

export function composeImageFilename(project) {
    const range = project.dataset.request.dateRange;
    return `tempstitch-${range.start}-to-${range.end}.png`;
}

export function composeInstructionsFilename(project) {
    const range = project.dataset.request.dateRange;
    return `tempstitch-pattern-${range.start}-to-${range.end}.txt`;
}

export function composeImagePlan(project) {
    const unitSymbol = project.design.tempUnit === 'fahrenheit' ? '°F' : '°C';
    const metadata = authorityMetadata(project);
    const headerHeight = 30 + metadata.length * 14;
    const width = Math.max(project.settings.stitchCount * STITCH_WIDTH + PADDING * 2, MIN_EXPORT_WIDTH);
    const height = headerHeight + project.pattern.rows.length * ROW_HEIGHT + KEY_HEIGHT + PADDING * 2;

    return {
        filename: composeImageFilename(project),
        title: heading(project, 'Design'),
        metadata,
        rows: project.pattern.rows,
        colourKey: project.design.colourKey,
        minLabel: `${project.design.min}${unitSymbol}`,
        maxLabel: `${project.design.max}${unitSymbol}`,
        stitchCount: project.settings.stitchCount,
        headerHeight,
        width,
        height,
    };
}

export function composeInstructionsText(project) {
    const title = heading(project, 'Pattern');
    return [
        title,
        '='.repeat(title.length),
        '',
        ...authorityMetadata(project),
        `Craft: ${project.settings.craftType === 'knit' ? 'Knitting' : 'Crochet'}`,
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
    const plan = composeImagePlan(project);

    const canvas = document.createElement('canvas');
    canvas.width = plan.width * 2;
    canvas.height = plan.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, plan.width, plan.height);

    ctx.fillStyle = '#1c1917';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(plan.title, plan.width / 2, 20);

    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#78716c';
    plan.metadata.forEach((line, index) => {
        ctx.fillText(line, plan.width / 2, 36 + index * 14);
    });

    let y = plan.headerHeight;
    plan.rows.forEach(row => {
        for (let s = 0; s < row.stitches; s++) {
            ctx.fillStyle = row.colour;
            ctx.fillRect(PADDING + s * STITCH_WIDTH, y, STITCH_WIDTH - 1, ROW_HEIGHT - 1);
        }
        y += ROW_HEIGHT;
    });

    const keyY = y + 10;
    const blockWidth = (plan.width - PADDING * 2) / plan.colourKey.length;
    plan.colourKey.forEach((entry, i) => {
        ctx.fillStyle = entry.colour;
        ctx.fillRect(PADDING + i * blockWidth, keyY, blockWidth, 12);
    });

    ctx.fillStyle = '#78716c';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(plan.minLabel, PADDING, keyY + 24);
    ctx.textAlign = 'right';
    ctx.fillText(plan.maxLabel, plan.width - PADDING, keyY + 24);

    const link = document.createElement('a');
    link.download = plan.filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

export function downloadInstructions(project) {
    const blob = new Blob([composeInstructionsText(project)], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = composeInstructionsFilename(project);
    link.href = url;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
