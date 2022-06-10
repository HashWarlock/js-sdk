import type {ApiPromise} from '@polkadot/api'
import {ContractPromise} from '@polkadot/api-contract'
import {useEffect, useState} from 'react'
import {signCertificate, CertificateData} from '@phala/sdk'
import {Button} from 'baseui/button'
import {ButtonGroup} from 'baseui/button-group'
import {Block} from 'baseui/block'
import {Input} from 'baseui/input'
import {toaster} from 'baseui/toast'
import {useAtom} from 'jotai'
import accountAtom from '../atoms/account'
import {getSigner} from '../lib/polkadotExtension'
import ContractLoader from '../components/ContractLoader'
import {copy} from "../lib/copy";

const NounsSubGraph: Page = () => {
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
        .setAcceptablePrice({price})
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
      const {output} = await contract.query.isNounAffordable(certificateData as any, {})
    // eslint-disable-next-line no-console
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h1">Set Affordable Price</HeadingMedium>
        <ParagraphSmall>
          Max Price (ETH):
        </ParagraphSmall>

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
          Update current Nouns auction data or query if the admin of the contract can afford to outbid the current top bidder.
        </ParagraphSmall>

        <ButtonGroup>
          <Button disabled={!account} onClick={onGetLatestNounsInfo}>
            Update
          </Button>
          <Button disabled={!certificateData} onClick={onQuery}>
            APE into Nouns?
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
      name="nounsSubgraph"
      onLoad={({api, contract}) => {
        setApi(api)
        setContract(contract)
      }}
    />
  )
}

NounsSubGraph.title = 'Can I Ape into NounsDAO?'

export default NounsSubGraph
