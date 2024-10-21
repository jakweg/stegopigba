import SeededRandom from './seeded-random'

const BLOCK_SIZE = 1024

export class PixelSkipper {
  private usedBitsCounter: number = 0
  private currentFlags: Array<boolean> = []
  private random: SeededRandom

  public constructor(
    seed: number,
    private readonly contentPixelSize: number,
    private readonly capacityPixelSize: number,
  ) {
    this.random = new SeededRandom(seed)
  }

  public getNextShouldSkip(): boolean {
    if (this.currentFlags.length === 0) {
      const useRatio = Math.min(this.contentPixelSize / this.capacityPixelSize, 1)
      const actualBlockSize = Math.min(BLOCK_SIZE, this.capacityPixelSize - this.usedBitsCounter)
      const usedPixelsPerBlock = Math.ceil(useRatio * actualBlockSize)

      const usedIndexes: number[] = []
      const availableIndexes = new Array(actualBlockSize)
      for (let i = 0; i < actualBlockSize; ++i) availableIndexes[i] = i

      for (let i = 0; i < usedPixelsPerBlock; ++i) {
        const index = (this.random.next() * availableIndexes.length) | 0
        const realIndex = availableIndexes.splice(index, 1)[0]
        usedIndexes.push(realIndex)
      }

      this.currentFlags = new Array(actualBlockSize)
      this.currentFlags.fill(false)

      for (const i of usedIndexes) {
        this.currentFlags[i] = true
      }
    }

    return !this.currentFlags.pop()
  }
}
