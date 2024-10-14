export class ReadableBitStream {
  private lastReadPosition: number = 0
  private constructor(private readonly array: Uint8Array) {}

  public static createFromUint8Array(array: Uint8Array | Uint8ClampedArray) {
    return new ReadableBitStream(array as Uint8Array)
  }

  public getNextByte(): number {
    let number = 0
    for (let i = 0; i < 8; ++i) {
      number |= this.getNextBit() << (7 - i)
    }
    return number
  }

  public getNextBit(): number {
    if (this.isOver()) return 0

    const byteIndex = (this.lastReadPosition / 8) | 0
    const bitInByteIndex = (7 - (this.lastReadPosition % 8)) | 0

    const entireByte = this.array[byteIndex]
    const justTheBit = (entireByte >> bitInByteIndex) & 0b01

    this.lastReadPosition++

    return justTheBit
  }

  public skipNextBits(count: number): void {
    this.lastReadPosition += count
  }

  public isOver(): boolean {
    return this.lastReadPosition >= this.array.length * 8
  }
}

export class WritableBitStream {
  private lastWritePosition: number = 0
  private constructor(private readonly array: Uint8Array) {}

  public static createFromUint8Array(array: Uint8Array | Uint8ClampedArray) {
    return new WritableBitStream(array as Uint8Array)
  }

  public putByte(byte: number): void {
    for (let i = 7; i >= 0; --i) {
      this.putBit((byte >> i) & 0b1)
    }
  }

  public putBit(bit: number): void {
    if (this.isOver()) return

    const byteIndex = (this.lastWritePosition / 8) | 0
    const bitInByteIndex = (7 - (this.lastWritePosition % 8)) | 0
    const bitInByteIndexAsShift = 1 << bitInByteIndex

    const entireByteBeforeChange = this.array[byteIndex]
    const entireByteWithoutBit = entireByteBeforeChange & ~bitInByteIndexAsShift
    const entireByteAfterChange = entireByteWithoutBit | ((bit & 0b1) << bitInByteIndex)

    this.array[byteIndex] = entireByteAfterChange

    this.lastWritePosition++
  }

  public skipNextBits(count: number): void {
    this.lastWritePosition += count
  }

  public isOver(): boolean {
    return this.lastWritePosition >= this.array.length * 8
  }
}
