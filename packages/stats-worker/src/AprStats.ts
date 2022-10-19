import { BigNumber, FixedNumber, constants } from 'ethers'
import { formatUnits, parseUnits } from 'ethers/lib/utils'
import {
  ethereumRpc,
  gnosisRpc,
  polygonRpc,
  optimismRpc,
  arbitrumRpc
} from './config'
import { Hop } from '@hop-protocol/sdk'
import { mainnet as mainnetAddresses } from '@hop-protocol/core/addresses'
import {
  StakingRewards,
  ERC20__factory,
  StakingRewards__factory
} from '@hop-protocol/core/contracts'

const TOTAL_AMOUNTS_DECIMALS = 18
const oneYearDays = 365

const stakingRewardsContracts: any = {
  arbitrum: {
    ETH: [
      '0x755569159598f3702bdD7DFF6233A317C156d3Dd',
    ],
    USDC: [
      '0xb0CabFE930642AD3E7DECdc741884d8C3F7EbC70',
    ],
    DAI: [
      '0xd4D28588ac1D9EF272aa29d4424e3E2A03789D1E',
    ],
    USDT: [
      '0x9Dd8685463285aD5a94D2c128bda3c5e8a6173c8',
    ],
  },
  optimism: {
    ETH: [
      '0x95d6A95BECfd98a7032Ed0c7d950ff6e0Fa8d697',
    ],
    USDC: [
      '0xf587B9309c603feEdf0445aF4D3B21300989e93a',
    ],
    DAI: [
      '0x392B9780cFD362bD6951edFA9eBc31e68748b190',
    ],
    USDT: [
      '0xAeB1b49921E0D2D96FcDBe0D486190B2907B3e0B',
    ],
    SNX: [
      '0x25a5A48C35e75BD2EFf53D94f0BB60d5A00E36ea',
      '0x09992Dd7B32f7b35D347DE9Bdaf1919a57d38E82',
    ],
  },
  polygon: {
    ETH: [
      '0x7bCeDA1Db99D64F25eFA279BB11CE48E15Fda427',
      '0xAA7b3a4A084e6461D486E53a03CF45004F0963b7',
    ],
    USDC: [
      '0x2C2Ab81Cf235e86374468b387e241DF22459A265',
      '0x7811737716942967Ae6567B26a5051cC72af550E',
    ],
    DAI: [
      '0x4Aeb0B5B1F3e74314A7Fa934dB090af603E8289b',
      '0xd6dC6F69f81537Fe9DEcc18152b7005B45Dc2eE7',
    ],
    USDT: [
      '0x07932e9A5AB8800922B2688FB1FA0DAAd8341772',
      '0x297E5079DF8173Ae1696899d3eACD708f0aF82Ce',
    ],
    MATIC: [
      '0x7dEEbCaD1416110022F444B03aEb1D20eB4Ea53f',
    ],
  },
  gnosis: {
    ETH: [
      '0xC61bA16e864eFbd06a9fe30Aab39D18B8F63710a',
      '0x712F0cf37Bdb8299D0666727F73a5cAbA7c1c24c',
    ],
    USDC: [
      '0x5D13179c5fa40b87D53Ff67ca26245D3D5B2F872',
      '0x636A7ee78faCd079DaBC8f81EDA1D09AA9D440A7',
    ],
    DAI: [
      '0x12a3a66720dD925fa93f7C895bC20Ca9560AdFe7',
      '0xBF7a02d963b23D84313F07a04ad663409CEE5A92',
    ],
    USDT: [
      '0x2C2Ab81Cf235e86374468b387e241DF22459A265',
      '0x3d4Cc8A61c7528Fd86C55cfe061a78dCBA48EDd1',
    ],
  }
}

const rewardTokenAddresses: any = {
  WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  GNO: '0x9C58BAcC331c9aa871AFD802DB6379a98e80CEdb'
}

type StakingAprRes = {
  apr: number
  aprTokenSymbol: string
}

type PoolData = {
  apr: number
  apr7Day: number
  apr30Day: number
  stakingApr?: number
  stakingAprTokenSymbol?: string
}

type Data = { [token: string]: { [chain: string]: PoolData } }

type Response = {
  timestamp: number
  data: Data
}

class AprStats {
  sdk = new Hop('mainnet')

  constructor () {
    this.sdk.setChainProviderUrls({
      ethereum: ethereumRpc,
      gnosis: gnosisRpc,
      polygon: polygonRpc,
      optimism: optimismRpc,
      arbitrum: arbitrumRpc
    })

    console.log(
      'provider urls:',
      JSON.stringify(this.sdk.getChainProviderUrls())
    )
  }

  async getAllAprs () {
    const timestamp = (Date.now() / 1000) | 0
    const data: Data = {}
    const bridges: any = mainnetAddresses.bridges
    const promises: Promise<any>[] = []
    for (let token in bridges) {
      for (let chain in bridges[token]) {
        if (chain === 'ethereum') {
          continue
        }
        if (!bridges[token][chain]) {
          continue
        }
        if (bridges[token][chain].l2CanonicalToken === constants.AddressZero) {
          continue
        }
        if (!data[token]) {
          data[token] = {}
        }
        if (!data[token][chain]) {
          data[token][chain] = {
            apr: 0,
            apr7Day: 0,
            apr30Day: 0,
            stakingApr: 0
          }
        }
        promises.push(
          this.getApr(token, chain)
            .then(apr => {
              console.log(`${chain}.${token} got apr`)
              data[token][chain].apr = apr
            })
            .catch(err => console.error(err))
        )
        promises.push(
          this.getApr(token, chain, 7)
            .then(apr => {
              console.log(`${chain}.${token} got apr 7 day`)
              data[token][chain].apr7Day = apr
            })
            .catch(err => console.error(err))
        )
        promises.push(
          this.getApr(token, chain, 30)
            .then(apr => {
              console.log(`${chain}.${token} got apr 30 day`)
              data[token][chain].apr30Day = apr
            })
            .catch(err => console.error(err))
        )
        promises.push(
          this.getStakingApr(token, chain)
            .then(res => {
              if (res?.apr) {
                console.log(`${chain}.${token} got staking apr`)
                data[token][chain].stakingApr = res.apr
              }
              if (res?.aprTokenSymbol) {
                console.log(`${chain}.${token} got staking apr token symbol`)
                data[token][chain].stakingAprTokenSymbol = res.aprTokenSymbol
              }
            })
            .catch(err => console.error(err))
        )
      }
    }

    await Promise.all(promises)
    console.log('apr stats:')
    console.log(JSON.stringify(data, null, 2))
    const response: Response = {
      timestamp,
      data
    }

    return response
  }

  async getApr (token: string, chain: string, days: number = 1) {
    const bridge = this.sdk.bridge(token)
    const amm = bridge.getAmm(chain)
    const apr = await amm.getApr(days)
    if (!apr) {
      return 0
    }
    return apr
  }

  async getStakingApr (token: string, chain: string): Promise<StakingAprRes> {
    const bridge = this.sdk.bridge(token)
    const canonToken = bridge.getCanonicalToken(chain)
    const amm = bridge.getAmm(chain)

    const provider = this.sdk.getChainProvider(chain)
    const stakingRewardsAddresses = stakingRewardsContracts?.[chain]?.[token]
    if (!stakingRewardsAddresses?.length) {
      return {
        apr: 0,
        aprTokenSymbol: ''
      }
    }

    let maxAprBn = BigNumber.from(0)
    let maxAprTokenSymbol = ''
    for (const stakingRewardsAddress of stakingRewardsAddresses) {
      const assetBridge = this.sdk.bridge(token)
      const stakingRewards = StakingRewards__factory.connect(
        stakingRewardsAddress,
        provider
      )
      const stakingToken = assetBridge.getSaddleLpToken(chain)

      const totalStaked = await stakingToken.balanceOf(stakingRewards?.address)
      if (totalStaked.lte(0)) {
        continue
      }

      const stakedTotal = await amm.calculateTotalAmountForLpToken(totalStaked)
      if (stakedTotal.lte(0)) {
        continue
      }

      const tokenUsdPrice = await bridge.priceFeed.getPriceByTokenSymbol(token)

      const rewardsTokenAddress = await stakingRewards.rewardsToken()
      const rewardsToken = ERC20__factory.connect(
        rewardsTokenAddress,
        provider
      )
      const rewardsTokenSymbol = await rewardsToken.symbol()
      const rewardTokenUsdPrice = await bridge?.priceFeed.getPriceByTokenSymbol(
        rewardsTokenSymbol
      )

      const timestamp = await stakingRewards.periodFinish()
      const rewardsExpired = await this.isRewardsExpired(timestamp)

      let totalRewardsPerDay = BigNumber.from(0)
      if (!rewardsExpired) {
        const rewardRate = await stakingRewards.rewardRate()
        totalRewardsPerDay = rewardRate.mul(86400) // multiply by 1 day
      }

      const aprBn = this.calculateStakingApr(
        canonToken.decimals,
        tokenUsdPrice,
        rewardTokenUsdPrice,
        stakedTotal,
        totalRewardsPerDay
      )

      maxAprBn = maxAprBn.gt(aprBn) ? maxAprBn : aprBn
      maxAprTokenSymbol = rewardsTokenSymbol
    }

    return {
      apr: Number(formatUnits(maxAprBn.toString(), TOTAL_AMOUNTS_DECIMALS)),
      aprTokenSymbol: maxAprTokenSymbol
    }
  }

  async isRewardsExpired (timestamp: BigNumber) {
    const expirationDate = Number(timestamp.toString())
    const now = (Date.now() / 1000) | 0
    return now > expirationDate
  }

  // ((REWARD-TOKEN_PER_DAY * REWARD-TOKEN_PRICE)/((STAKED_USDC + STAKED_HUSDC)*STAKED_TOKEN_PRICE)) * DAYS_PER_YEAR
  calculateStakingApr (
    tokenDecimals: number,
    tokenUsdPrice: number,
    rewardTokenUsdPrice: number,
    stakedTotal: BigNumber,
    totalRewardsPerDay: BigNumber
  ) {
    const rewardTokenUsdPriceBn = this.amountToBN(
      rewardTokenUsdPrice.toString(),
      TOTAL_AMOUNTS_DECIMALS
    )
    const tokenUsdPriceBn = this.amountToBN(
      tokenUsdPrice.toString(),
      TOTAL_AMOUNTS_DECIMALS
    )
    const stakedTotal18d = this.shiftBNDecimals(
      stakedTotal,
      TOTAL_AMOUNTS_DECIMALS - tokenDecimals
    )
    const precision = this.amountToBN('1', TOTAL_AMOUNTS_DECIMALS)

    return totalRewardsPerDay
      .mul(rewardTokenUsdPriceBn)
      .mul(precision)
      .div(stakedTotal18d.mul(tokenUsdPriceBn))
      .mul(oneYearDays)
  }

  shiftBNDecimals (bn: BigNumber, shiftAmount: number): BigNumber {
    if (shiftAmount < 0) throw new Error('shiftAmount must be positive')
    return bn.mul(BigNumber.from(10).pow(shiftAmount))
  }

  amountToBN (amount: string | number, decimals: number = 18) {
    const fixedAmount = this.fixedDecimals(amount.toString(), decimals)
    return parseUnits(fixedAmount || '0', decimals)
  }

  fixedDecimals (amount: string, decimals: number = 18) {
    if (amount === '') {
      return amount
    }
    const mdAmount = this.maxDecimals(amount, decimals)
    return FixedNumber.from(mdAmount).toString()
  }

  maxDecimals (amount: string, decimals: number) {
    const sanitizedAmount = this.sanitizeNumericalString(amount)
    const indexOfDecimal = sanitizedAmount.indexOf('.')
    if (indexOfDecimal === -1) {
      return sanitizedAmount
    }

    const wholeAmountStr = sanitizedAmount.slice(0, indexOfDecimal) || '0'
    const wholeAmount = BigNumber.from(wholeAmountStr).toString()

    const fractionalAmount = sanitizedAmount.slice(indexOfDecimal + 1)
    const decimalAmount =
      decimals !== 0 ? `.${fractionalAmount.slice(0, decimals)}` : ''

    return `${wholeAmount}${decimalAmount}`
  }

  sanitizeNumericalString (numStr: string) {
    return numStr.replace(/[^0-9.]|\.(?=.*\.)/g, '')
  }
}

export default AprStats
