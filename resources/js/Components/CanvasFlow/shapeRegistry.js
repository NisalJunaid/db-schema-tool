export const SHAPE_REGISTRY = {
    rect: {
        label: 'Rectangle',
        defaultSize: { width: 240, height: 140 },
        icon: 'fa-regular fa-square',
    },
    rounded: {
        label: 'Rounded Rectangle',
        defaultSize: { width: 240, height: 140 },
        icon: 'fa-regular fa-square-full',
    },
    circle: {
        label: 'Circle',
        defaultSize: { width: 170, height: 170 },
        icon: 'fa-regular fa-circle',
    },
    diamond: {
        label: 'Diamond',
        defaultSize: { width: 220, height: 160 },
        icon: 'fa-regular fa-gem',
    },
    parallelogram: {
        label: 'Parallelogram',
        defaultSize: { width: 250, height: 140 },
        icon: 'fa-solid fa-slash',
    },
    cylinder: {
        label: 'Cylinder',
        defaultSize: { width: 220, height: 150 },
        icon: 'fa-solid fa-database',
    },
    document: {
        label: 'Document',
        defaultSize: { width: 230, height: 150 },
        icon: 'fa-regular fa-file-lines',
    },
    cloud: {
        label: 'Cloud',
        defaultSize: { width: 240, height: 150 },
        icon: 'fa-solid fa-cloud',
    },
    star: {
        label: 'Star',
        defaultSize: { width: 190, height: 190 },
        icon: 'fa-regular fa-star',
    },
    hexagon: {
        label: 'Hexagon',
        defaultSize: { width: 220, height: 160 },
        icon: 'fa-regular fa-hexagon',
    },
    trapezoid: {
        label: 'Trapezoid',
        defaultSize: { width: 230, height: 150 },
        icon: 'fa-solid fa-draw-polygon',
    },
    triangle: {
        label: 'Triangle',
        defaultSize: { width: 210, height: 170 },
        icon: 'fa-solid fa-play',
    },
    pentagon: {
        label: 'Pentagon',
        defaultSize: { width: 220, height: 180 },
        icon: 'fa-solid fa-draw-polygon',
    },
    octagon: {
        label: 'Octagon',
        defaultSize: { width: 230, height: 170 },
        icon: 'fa-solid fa-draw-polygon',
    },
};

export const SHAPE_KEYS = Object.keys(SHAPE_REGISTRY);
