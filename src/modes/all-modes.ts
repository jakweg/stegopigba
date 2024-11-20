import lsb from './lsb-random'
import twoTwoFourLsb from './2-2-4'
import lsbAES from './lsb-aes'
import encryptionLayeredLSB from './encryption-layered-lsb'
import { Mode } from './template'

export default [lsb, twoTwoFourLsb, lsbAES, encryptionLayeredLSB] satisfies Array<Mode>
