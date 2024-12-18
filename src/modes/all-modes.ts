import lsb from './lsb-random'
import twoTwoFourLsb from './2-2-4'
import lsbAES from './lsb-aes'
import encryptionLayeredLSB from './encryption-layered-lsb'
import { Mode } from './template'
import variousBits from './various-bits'
import hsv from './hsv'
import hsvLightness from './hsv-lightness'

export default [lsb, hsv, hsvLightness, twoTwoFourLsb, lsbAES, encryptionLayeredLSB, variousBits] satisfies Array<Mode>
