export async function toPng(node, options = {}) {
    if (!node) {
        throw new Error('Target element is required.');
    }

    const { pixelRatio = 1, backgroundColor = '#ffffff' } = options;
    const { width, height } = node.getBoundingClientRect();
    const clonedNode = node.cloneNode(true);
    const serialized = new XMLSerializer().serializeToString(clonedNode);

    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
            <foreignObject width="100%" height="100%">
                <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:${backgroundColor};">${serialized}</div>
            </foreignObject>
        </svg>
    `;

    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width * pixelRatio;
            canvas.height = height * pixelRatio;

            const context = canvas.getContext('2d');
            if (!context) {
                URL.revokeObjectURL(url);
                reject(new Error('Unable to get canvas context.'));
                return;
            }

            context.scale(pixelRatio, pixelRatio);
            context.fillStyle = backgroundColor;
            context.fillRect(0, 0, width, height);
            context.drawImage(image, 0, 0);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };

        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Unable to render image.'));
        };

        image.src = url;
    });
}
