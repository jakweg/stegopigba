export class ReadableBitStream {
  private lastReadPosition: number = 0
  private constructor(private readonly array: Uint8Array, private readonly skipEveryForthByte: boolean) {}

  public static createFromUint8Array(array: Uint8Array | Uint8ClampedArray, skipEveryForthByte: boolean) {
    return new ReadableBitStream(array as Uint8Array, skipEveryForthByte)
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
    this.moveToNextUnskipableBit()

    const byteIndex = (this.lastReadPosition / 8) | 0
    const bitInByteIndex = (7 - (this.lastReadPosition % 8)) | 0

    const entireByte = this.array[byteIndex]
    const justTheBit = (entireByte >> bitInByteIndex) & 0b01

    this.lastReadPosition++

    return justTheBit
  }

  private moveToNextUnskipableBit() {
    while (this.shouldSkipBit()) this.lastReadPosition++
  }

  private shouldSkipBit() {
    if (!this.skipEveryForthByte) return false
    const byteIndex = (this.lastReadPosition / 8) | 0
    return byteIndex % 4 === 3
  }

  public skipNextBits(count: number): void {
    this.moveToNextUnskipableBit()
    this.lastReadPosition += count
  }

  public isOver(): boolean {
    return this.lastReadPosition >= this.array.length * 8
  }
}

export class WritableBitStream {
  private lastWritePosition: number = 0
  private constructor(private readonly array: Uint8Array, private readonly skipEveryForthByte: boolean) {}

  public static createFromUint8Array(array: Uint8Array | Uint8ClampedArray, skipEveryForthByte: boolean) {
    return new WritableBitStream(array as Uint8Array, skipEveryForthByte)
  }

  public putByte(byte: number): void {
    for (let i = 7; i >= 0; --i) {
      this.putBit((byte >> i) & 0b1)
    }
  }

  public putBit(bit: number): void {
    if (this.isOver()) return
    this.moveToNextUnskipableBit()

    const byteIndex = (this.lastWritePosition / 8) | 0
    const bitInByteIndex = (7 - (this.lastWritePosition % 8)) | 0
    const bitInByteIndexAsShift = 1 << bitInByteIndex

    const entireByteBeforeChange = this.array[byteIndex]
    const entireByteWithoutBit = entireByteBeforeChange & ~bitInByteIndexAsShift
    const entireByteAfterChange = entireByteWithoutBit | ((bit & 0b1) << bitInByteIndex)

    this.array[byteIndex] = entireByteAfterChange

    this.lastWritePosition++
    // console.log('write done', 1)
  }

  private moveToNextUnskipableBit() {
    while (this.shouldSkipBit()) this.lastWritePosition++
  }

  private shouldSkipBit() {
    if (!this.skipEveryForthByte) return false
    const byteIndex = (this.lastWritePosition / 8) | 0
    return byteIndex % 4 === 3
  }

  public skipNextBits(count: number): void {
    this.moveToNextUnskipableBit()
    this.lastWritePosition += count
    // console.log('write skip', count)
  }

  public isOver(): boolean {
    return this.lastWritePosition >= this.array.length * 8
  }
}
