import { RefObject } from 'react'

export type ReadResult = 'failed' | Uint8Array | Uint8Array[]

export type SupportedInput = 'single-text' | '6-text'

export interface ExecutionHandle {
  doWrite(image: ImageData, data: Uint8Array | Array<Uint8Array>): Promise<void> | void

  doRead(image: ImageData): Promise<ReadResult> | ReadResult

  calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number

  calculatePSNR?: (originalImage: ImageData, encodedImage: ImageData) => number
}

export interface Props {
  isReadMode: boolean
  executor: RefObject<ExecutionHandle>
  requestRefresh: () => void
}
export interface Mode {
  label: string
  supportedInput: SupportedInput
  OptionsComponent: (props: Props) => void
}
