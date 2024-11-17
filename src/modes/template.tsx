import { RefObject } from 'react'

export type ReadResult = 'failed' | Uint8Array| Uint8Array[]

export interface ExecutionHandle {
  doWrite(image: ImageData, data: Uint8Array | Array<Uint8Array>): void

  doRead(image: ImageData): ReadResult

  calculateMaxStorageCapacityBits(imageWidth: number, imageHeight: number): number
  calculatePSNR?: (originalImage: ImageData, encodedImage: ImageData) => number;
}

export interface Props {
  isReadMode: boolean
  executor: RefObject<ExecutionHandle>
  requestRefresh: () => void
}
export interface Mode {
  label: string
  OptionsComponent: (props: Props) => void
}
