export const PROJECT_TYPES = {
    scarf: 'scarf',
    blanket: 'blanket',
};

export const PROJECT_TYPE_LABELS = {
    scarf: 'Scarf',
    blanket: 'Blanket',
};

export function typeLabel(type) {
    return PROJECT_TYPE_LABELS[type] || PROJECT_TYPE_LABELS.blanket;
}
