export interface IOController { [key: KeyboardEvent['code'] | 'left_mouse']: boolean };


export const setUpIOControllerListeners = (io_controller: IOController, canvasElement: HTMLCanvasElement) => {
    function keyDown(event: KeyboardEvent) {
        io_controller[event.code] = true;
    }
    function keyUp(event: KeyboardEvent) {
        io_controller[event.code] = false;
    }
    const mouseDown = (event: MouseEvent) => {
        if (event.button === 0) {
            io_controller['left_mouse'] = true;
        }
    };
    const mouseUp = (event: MouseEvent) => {
        if (event.button === 0) {
            io_controller['left_mouse'] = false;
        }
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    canvasElement.addEventListener('mousedown', mouseDown);
    canvasElement.addEventListener('mouseup', mouseUp);
};