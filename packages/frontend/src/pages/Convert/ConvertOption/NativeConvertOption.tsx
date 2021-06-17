import { Signer, Contract, BigNumber, BigNumberish } from 'ethers'
import ConvertOption, { DetailRow } from './ConvertOption'
import Network from 'src/models/Network'
import { Hop, HopBridge, Token } from '@hop-protocol/sdk'

class NativeConvertOption extends ConvertOption {
  readonly name: string
  readonly slug: string
  readonly path: string

  constructor () {
    super()

    this.name = 'Native Bridge'
    this.slug = 'native-bridge'
    this.path = '/bridge'
  }

  async getTargetAddress (
    sdk: Hop,
    l1TokenSymbol: string | undefined,
    sourceNetwork: Network | undefined,
    destNetwork: Network | undefined
  ): Promise<string> {
    if (!l1TokenSymbol) {
      throw new Error('Token symbol is required to get target address')
    }

    if (!sourceNetwork) {
      throw new Error('destNetwork is required to get target address')
    }

    if (!destNetwork) {
      throw new Error('destNetwork is required to get target address')
    }

    let l2Network: Network
    if (!sourceNetwork.isLayer1) {
      l2Network = sourceNetwork
    } else {
      l2Network = destNetwork
    }

    const nativeBridge = sdk
      .canonicalBridge(l1TokenSymbol, l2Network.slug)

    let bridgeContract: Contract
    if (sourceNetwork?.isLayer1) {
      bridgeContract = await nativeBridge.getL1CanonicalBridge()
    } else {
      bridgeContract = await nativeBridge.getL2CanonicalBridge()
    }

    return bridgeContract.address
  }

  async calcAmountOut (
    sdk: Hop,
    sourceNetwork: Network,
    destNetwork: Network,
    isForwardDirection: boolean,
    l1TokenSymbol: string,
    value: string
  ) {
    return BigNumber.from(value)
  }

  async convert (
    sdk: Hop,
    signer: Signer,
    sourceNetwork: Network,
    destNetwork: Network,
    isForwardDirection: boolean,
    l1TokenSymbol: string,
    value: string
  ) {
    let l2Network: Network
    if (!sourceNetwork.isLayer1) {
      l2Network = sourceNetwork
    } else {
      l2Network = destNetwork
    }

    const bridge = sdk
      .canonicalBridge(l1TokenSymbol, l2Network.slug)
      .connect(signer as Signer)

    if (sourceNetwork.isLayer1 && isForwardDirection) {
      return bridge.connect(signer as Signer).deposit(value)
    } else if (destNetwork.isLayer1 && !isForwardDirection) {
      return bridge.connect(signer as Signer).withdraw(value)
    } else {
      throw new Error('Invalid isForwardDirection and network configuration')
    }
  }

  async sourceToken (isForwardDirection: boolean, network?: Network, bridge?: HopBridge): Promise<Token | undefined> {
    if (!bridge || !network) return

    if (isForwardDirection) {
      return bridge.getL1Token()
    } else {
      return bridge.getCanonicalToken(network.slug)
    }
  }

  async destToken (isForwardDirection: boolean, network?: Network, bridge?: HopBridge): Promise<Token | undefined> {
    if (!bridge || !network) return

    if (isForwardDirection) {
      return bridge.getCanonicalToken(network.slug)
    } else {
      return bridge.getL1Token()
    }
  }

  async getDetails (
    sdk: Hop,
    amountIn: BigNumberish | undefined,
    sourceNetwork: Network | undefined,
    destNetwork: Network | undefined,
    isForwardDirection: boolean,
    l1TokenSymbol: string
  ): Promise<DetailRow[]> {
    return []
  }
}

export default NativeConvertOption
