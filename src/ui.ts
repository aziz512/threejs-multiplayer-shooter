export const hideAllScreens = () => {
    document.querySelectorAll('.ui-screen').forEach(screen => {
        screen.style.display = 'none';
    });
};

export enum Screen {
    Home = 'welcome-popup',
    GameCreated = 'game-created-popup',
    JoinGame = 'join-game-popup'
}

export const switchToScreen = (screen: Screen) => {
    document.querySelector('.modal-overlay').style.visibility = 'visible';
    hideAllScreens();
    document.querySelector('#' + screen).style.display = 'block';
};

export const hideOverlay = () => {
    (document.querySelector('.modal-overlay') as HTMLDivElement).style.visibility = 'hidden';
};

export const showGameStats = () => {
    (document.querySelector('#game-stats-overlay') as HTMLDivElement).style.display = 'block';
};