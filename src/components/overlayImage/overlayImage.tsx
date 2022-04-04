import colorConverter from 'colorConverter';
import React, { startTransition, useEffect, useRef, useState } from 'react';
import { selectPixelsToPlaceQueue } from 'store/slices/pixelPlacementSlice';
import { gameCoordsToScreen } from 'utils/coordConversion';

import { useAppSelector } from '../../store/hooks';
import { Cell, selectCanvasPalette, selectCanvasSize, selectGameViewCenter, selectGameViewScale } from '../../store/slices/gameSlice';
import {
    selectInputFile,
    selectInputUrl,
    selectOverlayOffsetCoordsOnScreen,
    selectPlacementTransparency,
    selectRenderImageData,
    selectShouldShowImageFromData,
    selectShouldShowImageFromUrl,
    selectWindowSize,
} from '../../store/slices/overlaySlice';
import { makeStyles } from '../../theme/makeStyles';

const useStyles = makeStyles()({
    overlayImage: {
        position: 'absolute',
        left: 0,
        top: 0,
        pointerEvents: 'none',
        transformOrigin: 'top left',
        imageRendering: 'pixelated',
    },
    overlayImageSplitChunk: {
        transform: `scale(${1 / 3})`,
        transformOrigin: 'top left',
        position: 'absolute',
        pointerEvents: 'none',
    },
    overlayImageSplitChunkWrapper: {
        position: 'fixed',
        pointerEvents: 'none',
        transformOrigin: 'top left',
        imageRendering: 'pixelated',
    },
});

const splitRenderCanvasSize = 1024;
const PlaceQueuePixels: React.FC = () => {
    // multiple canvases, because single canvas is not capable of handling too many pixels
    const canvasesRef = useRef<HTMLCanvasElement[]>([]);
    const { classes } = useStyles();
    const placeQueue = useAppSelector(selectPixelsToPlaceQueue);
    const viewScale = useAppSelector(selectGameViewScale);
    const windowSize = useAppSelector(selectWindowSize);
    const gameViewCenter = useAppSelector(selectGameViewCenter);
    const canvasPalette = useAppSelector(selectCanvasPalette);
    const canvasSize = useAppSelector(selectCanvasSize);
    const splitCanvasesWidth = Math.ceil(canvasSize / splitRenderCanvasSize);
    const [canvasTopLeftOnScreen, setCanvasTopLeftOnScreen] = useState<ReturnType<typeof gameCoordsToScreen>>({ clientX: 0, clientY: 0 });
    useEffect(() => {
        const canvasTopLeft = gameCoordsToScreen({ x: -canvasSize / 2, y: -canvasSize / 2 }, { height: windowSize.innerHeight, width: windowSize.innerWidth }, gameViewCenter, viewScale);
        setCanvasTopLeftOnScreen(canvasTopLeft);
    }, [canvasSize, gameViewCenter, viewScale, windowSize.innerHeight, windowSize.innerWidth]);
    const [splitCanvases, setSplitCanvases] = useState<
        {
            gameCoordsTopLeft: {
                x: number;
                y: number;
            };
            leftCanvasOffsetFromCanvasCorner: number;
            topCanvasOffsetFromCanvasCorner: number;
            splitRenderCanvasId: number;
            pixels: {
                color: number;
                coord: Cell;
            }[];
        }[]
    >([]);
    useEffect(() => {
        startTransition(() => {
            const splits = placeQueue
                .map((x) => ({
                    ...x,
                    splitRenderCanvasX: Math.floor((x.coord.x + canvasSize / 2) / splitRenderCanvasSize),
                    splitRenderCanvasY: Math.floor((x.coord.y + canvasSize / 2) / splitRenderCanvasSize),
                }))
                .map((x) => ({ ...x, splitRenderCanvasId: x.splitRenderCanvasX + x.splitRenderCanvasY * splitCanvasesWidth }))
                .reduce((acc, x) => {
                    const foundAccumulator = acc[x.splitRenderCanvasId];
                    if (!foundAccumulator) {
                        acc[x.splitRenderCanvasId] = {
                            pixels: [{ color: x.color, coord: x.coord }],
                            splitRenderCanvasId: x.splitRenderCanvasId,
                        };
                        return acc;
                    }
                    foundAccumulator.pixels.push({ color: x.color, coord: x.coord });
                    return acc;
                }, [] as { splitRenderCanvasId: number; pixels: { color: number; coord: Cell }[] }[])
                .map((x) => {
                    const gameCoordsTopLeft = {
                        x: (x.splitRenderCanvasId % splitCanvasesWidth) * splitRenderCanvasSize - canvasSize / 2,
                        y: Math.floor(x.splitRenderCanvasId / splitCanvasesWidth) * splitRenderCanvasSize - canvasSize / 2,
                    };
                    return {
                        ...x,
                        gameCoordsTopLeft,
                        leftCanvasOffsetFromCanvasCorner: gameCoordsTopLeft.x + canvasSize / 2,
                        topCanvasOffsetFromCanvasCorner: gameCoordsTopLeft.y + canvasSize / 2,
                    };
                });
            setSplitCanvases(splits);
        });
    }, [canvasSize, placeQueue, splitCanvasesWidth]);

    // TODO need to optimize the heck out of this.
    // Create some sort of selector to split pixels queue into chunked arrays (separate from splitCanvases obj), then we'll have to do less redraws

    useEffect(() => {
        startTransition(() => {
            splitCanvases.forEach((splitCanvas) => {
                const canvas = canvasesRef.current[splitCanvas.splitRenderCanvasId];
                if (!canvas) return;
                const imageDataWidth = splitRenderCanvasSize * 3;
                const imageData = new ImageData(imageDataWidth, imageDataWidth);
                canvas.width = imageData.width;
                canvas.height = imageData.height;
                splitCanvas.pixels.forEach((x) => {
                    const currentXOffsetFromCorner = x.coord.x - splitCanvas.gameCoordsTopLeft.x;
                    const currentYOffsetFromCorner = x.coord.y - splitCanvas.gameCoordsTopLeft.y;
                    const rgb = colorConverter.getActualColorFromPalette(canvasPalette, x.color);
                    if (!rgb) return;
                    // eslint-disable-next-line no-bitwise
                    const idx = (currentXOffsetFromCorner * 3 + 1 + (currentYOffsetFromCorner * 3 + 1) * imageDataWidth) << 2;
                    const [r, g, b] = rgb;
                    imageData.data[idx] = r;
                    imageData.data[idx + 1] = g;
                    imageData.data[idx + 2] = b;
                    imageData.data[idx + 3] = 255;
                });
                canvas.getContext('2d')?.putImageData(imageData, 0, 0);
            });
        });
    }, [canvasPalette, splitCanvases]);

    return (
        <div
            className={classes.overlayImageSplitChunkWrapper}
            style={{
                left: canvasTopLeftOnScreen.clientX,
                top: canvasTopLeftOnScreen.clientY,
                transform: `scale(${viewScale})`,
            }}
        >
            {splitCanvases.map((x) => (
                <canvas
                    key={x.splitRenderCanvasId}
                    ref={(ref) => {
                        if (ref) canvasesRef.current[x.splitRenderCanvasId] = ref;
                    }}
                    className={classes.overlayImageSplitChunk}
                    style={{
                        left: x.leftCanvasOffsetFromCanvasCorner,
                        top: x.topCanvasOffsetFromCanvasCorner,
                    }}
                />
            ))}
        </div>
    );
};

const OverlayImageCanvas: React.FC = () => {
    const imageData = useAppSelector(selectRenderImageData);
    const { classes } = useStyles();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { leftOffset, topOffset } = useAppSelector(selectOverlayOffsetCoordsOnScreen);
    const opacity = useAppSelector(selectPlacementTransparency) / 100;
    const viewScale = useAppSelector(selectGameViewScale);

    useEffect(() => {
        if (!imageData) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        const ctx = canvas.getContext('2d');
        ctx?.putImageData(imageData, 0, 0);
    }, [imageData]);

    if (!imageData) return <div>missing image data</div>;

    return (
        <canvas
            ref={canvasRef}
            className={classes.overlayImage}
            style={{
                opacity,
                transform: `scale(${viewScale})`,
                left: leftOffset,
                top: topOffset,
            }}
        />
    );
};

const useFileUrlFromFile = () => {
    const imageFile = useAppSelector(selectInputFile);
    const [fileUrl, setFileUrl] = React.useState<string>();
    useEffect(() => {
        if (!imageFile) return undefined;
        const newFileUrl = URL.createObjectURL(imageFile);
        setFileUrl(newFileUrl);
        return () => {
            URL.revokeObjectURL(newFileUrl);
        };
    }, [imageFile]);
    return fileUrl;
};

const useRenderImageUrl = () => {
    const imageUrl = useAppSelector(selectInputUrl);
    const fileUrl = useFileUrlFromFile();
    return fileUrl || imageUrl;
};

const OverlayImageImg: React.FC = () => {
    const imageUrl = useRenderImageUrl();
    const { classes } = useStyles();
    const { leftOffset, topOffset } = useAppSelector(selectOverlayOffsetCoordsOnScreen);
    const opacity = useAppSelector(selectPlacementTransparency) / 100;
    const viewScale = useAppSelector(selectGameViewScale);

    if (!imageUrl) return <div>missing image url</div>;

    return (
        <img
            alt=""
            className={classes.overlayImage}
            src={imageUrl}
            style={{
                opacity,
                transform: `scale(${viewScale})`,
                left: leftOffset,
                top: topOffset,
            }}
        />
    );
};

const OverlayImage: React.FC = () => {
    const shouldShowImageFromData = useAppSelector(selectShouldShowImageFromData);
    const shouldShowImageFromUrl = useAppSelector(selectShouldShowImageFromUrl);

    if (shouldShowImageFromData) return <OverlayImageCanvas />;
    if (shouldShowImageFromUrl) return <OverlayImageImg />;
    return <PlaceQueuePixels />;
};

export default OverlayImage;
