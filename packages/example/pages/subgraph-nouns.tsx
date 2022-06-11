import type {ApiPromise} from '@polkadot/api'
import {ContractPromise} from '@polkadot/api-contract'
import {useEffect, useState} from 'react'
import {signCertificate, CertificateData} from '@phala/sdk'
import {Button} from 'baseui/button'
import {ButtonGroup} from 'baseui/button-group'
import {Block} from 'baseui/block'
import {Input} from 'baseui/input'
import {toaster} from 'baseui/toast'
import {HeadingMedium, ParagraphSmall} from 'baseui/typography'
import {useAtom} from 'jotai'
import accountAtom from '../atoms/account'
import {getSigner} from '../lib/polkadotExtension'
import ContractLoader from '../components/ContractLoader'

const SubgraphNouns: Page = () => {
  const [account] = useAtom(accountAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [api, setApi] = useState<ApiPromise>()
  const [contract, setContract] = useState<ContractPromise>()
  const [affordablePrice, setAffordablePrice] = useState<number>()

  useEffect(
    () => () => {
      api?.disconnect()
    },
    [api]
  )

  useEffect(() => {
    setCertificateData(undefined)
  }, [account])

  const onSignCertificate = async () => {
    if (account && api) {
      try {
        const signer = await getSigner(account)

        // Save certificate data to state, or anywhere else you want like local storage
        setCertificateData(
          await signCertificate({
            api,
            account,
            signer,
          })
        )
        toaster.positive('Certificate signed', {})
      } catch (err) {
        toaster.negative((err as Error).message, {})
      }
    }
  }

  const setAcceptablePrice = async (price: number) => {
    if (!certificateData || !contract || !account) return
    const toastKey = toaster.info('Setting price limit...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .setAcceptablePrice({}, price)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Price set successfully!', {})
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setAffordablePrice(price)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }

  const onIsNounAffordable = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.isNounAffordable(
      certificateData as any,
      {}
    )
    const outputJson = output?.toJSON() as any
    console.log(output?.toHuman())
    // eslint-disable-next-line no-console
    if (outputJson.ok == true) {
      toaster.positive('Noun is reasonable to bid on!', {})
    } else {
      toaster.positive('NOT TODAY!!!', {})
    }
  }

  const onGetNounsId = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getNounsId(certificateData as any, {})
    // eslint-disable-next-line no-console
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetCurrentBid = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getCurrentBid(certificateData as any, {})
    // eslint-disable-next-line no-console
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetAcceptablePrice = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getAcceptablePrice(certificateData as any, {})
    // eslint-disable-next-line no-console
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetLatestNounsInfo = async () => {
    if (!certificateData || !contract || !account) return
    const {output} = await contract.query.getLatestNounsInfo(
      certificateData as any,
      {}
    )
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
    // outputJson is a `Result<NounsInfoFE>`
    const outputJson = output?.toJSON() as any

    if (outputJson.ok) {
      toaster.positive('Retrieved the latest Nouns auction information', {})
      // Set the latest information on the current Nouns auction
      const toastKey = toaster.info(
        'Setting latest info on current Nouns auction...',
        {
          autoHideDuration: 0,
        }
      )
      try {
        const signer = await getSigner(account)
        await contract.tx
          .setNounsInfo({}, outputJson.ok)
          .signAndSend(account.address, {signer}, (status) => {
            if (status.isFinalized) {
              toaster.clear(toastKey)
              toaster.positive('Latest Nouns info transaction is finalized', {})
            }
          })
      } catch (err) {
        toaster.clear(toastKey)
        toaster.negative((err as Error).message, {})
      }
    } else {
      toaster.negative(outputJson.err, {})
    }
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h1">Set Affordable Price</HeadingMedium>
        <ParagraphSmall>Max Price (ETH):</ParagraphSmall>

        <Block display="flex">
          <Input
            overrides={{
              Root: {
                style: ({$theme}) => ({
                  flex: 1,
                  marginRight: $theme.sizing.scale400,
                }),
              },
            }}
            autoFocus
            type="number"
            value={affordablePrice}
            onChange={(e) => setAffordablePrice(e.currentTarget.valueAsNumber)}
          />
          <Button
            onClick={() => {
              setAcceptablePrice(affordablePrice)
            }}
            kind="secondary"
          >
            Set Price
          </Button>
        </Block>

        <HeadingMedium marginTop="scale1000" as="h1">
          User Functions
        </HeadingMedium>
        <ParagraphSmall>
          Update current Nouns auction data or query if the admin of the
          contract can afford to outbid the current top bidder.
        </ParagraphSmall>

        <ButtonGroup>
          <Button disabled={!account} onClick={onGetLatestNounsInfo}>
            Update
          </Button>
          <Button disabled={!certificateData} onClick={onIsNounAffordable}>
            APE into Nouns?
          </Button>
          <Button disabled={!certificateData} onClick={onGetNounsId}>
            Noun ID
          </Button>
          <Button disabled={!certificateData} onClick={onGetCurrentBid}>
            Last Updated Bid
          </Button>
          <Button disabled={!certificateData} onClick={onGetAcceptablePrice}>
            Max Affordable Price
          </Button>
        </ButtonGroup>
      </>
    ) : (
      <Button disabled={!account} onClick={onSignCertificate}>
        Sign Certificate
      </Button>
    )
  ) : (
    <ContractLoader
      name="subgraphNouns"
      onLoad={({api, contract}) => {
        setApi(api)
        setContract(contract)
      }}
    />
  )
}

SubgraphNouns.title = 'Can I Ape into NounsDAO?'

export default SubgraphNouns
