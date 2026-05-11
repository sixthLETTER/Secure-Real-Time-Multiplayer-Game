class Player {
  constructor({ x, y, score, id }) {
    this.x = x;
    this.y = y;
    this.score = score;
    this.id = id;
  }

  movePlayer(dir, speed) {
    switch (dir) {
      case 'up':
        this.y -= speed;
        break;
      case 'down':
        this.y += speed;
        break;
      case 'left':
        this.x -= speed;
        break;
      case 'right':
        this.x += speed;
        break;
    }
  }

  collision(item) {
    const playerSize = 30;
    const itemSize = 20;
    if (
      this.x < item.x + itemSize &&
      this.x + playerSize > item.x &&
      this.y < item.y + itemSize &&
      this.y + playerSize > item.y
    ) {
      return true;
    }
    return false;
  }

  calculateRank(arr) {
    const sorted = arr.sort((a, b) => b.score - a.score);
    const rank = sorted.findIndex(p => p.id === this.id) + 1;
    return `Rank: ${rank}/${arr.length}`;
  }
}

export default Player;