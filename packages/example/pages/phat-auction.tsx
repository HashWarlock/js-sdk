import {ApiPromise} from '@polkadot/api'
import {ContractPromise} from '@polkadot/api-contract'
import {useEffect, useState} from 'react'
import {signCertificate, CertificateData} from '@phala/sdk'
import {Button} from 'baseui/button'
import {Block} from 'baseui/block'
import {Input} from 'baseui/input'
import {toaster} from 'baseui/toast'
import {HeadingMedium, ParagraphSmall} from 'baseui/typography'
import {useAtom} from 'jotai'
import accountAtom from '../atoms/account'
import {getSigner} from '../lib/polkadotExtension'
import ContractLoader from '../components/ContractLoader'

const PhatAuction: Page = () => {
  // Basic states for contract interaction
  const [account] = useAtom(accountAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [api, setApi] = useState<ApiPromise>()
  const [contract, setContract] = useState<ContractPromise>()

  // UI specific
  const [tokenId, setTokenId] = useState('')
  const [reservePrice, setReservePrice] = useState(0)
  const [bidIncrement, setBidIncrement] = useState(0)
  const [topBidder, setTopBidder] = useState('')
  const [settled, setSettled] = useState(true)
  const [botId, setBotId] = useState('')
  const [chatId, setChatId] = useState('')

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

  // Get the RMRK NFT ID
  const getTokenId = async () => {
    if (!certificateData || !contract) return

    const {output} = await contract.query.getTokenId(
      certificateData as any,
      {}
    )
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }
  // Get current reserve price (top bid price)
  const getReservePrice = async () => {
    if (!certificateData || !contract) return

    const {output} = await contract.query.getTopBid(certificateData as any, {})
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }
  // Get the auction status
  const auctionStatus = async () => {
    if (!certificateData || !contract) return

    const {output} = await contract.query.getAuctionStatus(
      certificateData as any,
      {}
    )
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }
  // Configure auction bot
  const onConfigureBot = async () => {
    if (!certificateData || !contract || !account) return
    const toastKey = toaster.info('Configuring auction bot...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .adminSetAuctionBot({}, chatId, botId)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Auction bot is configured', {})
            setChatId(chatId)
            setBotId(botId)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }
  // Configure auction
  const onConfigureAuction = async () => {
    if (!certificateData || !contract || !account) return
    const toastKey = toaster.info('Configuring auction settings...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .adminSetAuctionSettings({}, tokenId, reservePrice, bidIncrement)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Auction is configured', {})
            setTokenId(tokenId)
            setReservePrice(reservePrice)
            setBidIncrement(bidIncrement)
            setSettled(false)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }
  // Start Auction
  const onStartAuction = async () => {
    if (!certificateData || !contract || !account || !tokenId || settled) return
    const toastKey = toaster.info('Starting auction...', {
      autoHideDuration: 0,
    })
    const {output} = await contract.query.createAuction(
      certificateData as any,
      {},
      tokenId
    )
    // Ensure query is Ok
    console.log(output?.toHuman())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }
  // Bid on the auction
  const onBid = async () => {
    if (!certificateData || !contract || !account || !tokenId || settled) return
    const toastKey = toaster.info('Processing bid...', {
      autoHideDuration: 0,
    })
    let successBid = false
    try {
      const signer = await getSigner(account)
      await contract.tx
        .sendBid({}, reservePrice)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Bid accepted!', {})
            setReservePrice(reservePrice)
            setTopBidder(account.address)
            successBid = true
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
    if (successBid) {
      const {output} = await contract.query.updateNewBid(
        certificateData as any,
        {}
      )
      // Ensure query is Ok
      console.log(output?.toHuman())
      toaster.info(JSON.stringify(output?.toHuman()), {})
    }
  }
  // Settle Auction
  const onSettleAuction = async () => {
    if (!certificateData || !contract || !account || !tokenId || settled) return
    const toastKey = toaster.info('Settling auction...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .settleAuction({})
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Auction Settled!', {})
            setSettled(true)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
    if (settled) {
      const {output} = await contract.query.updateResults(
        certificateData as any,
        {}
      )
      // Ensure query is Ok
      console.log(output?.toHuman())
      toaster.info(JSON.stringify(output?.toHuman()), {})
    }
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h1">Configure Auction Bot</HeadingMedium>
        <ParagraphSmall>
          Bot Token ID:
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
            value={botId}
            onChange={(e) => setBotId(e.currentTarget.value)}
            />
        </Block>
        <ParagraphSmall>
          Chat ID:
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
            value={chatId}
            onChange={(e) => setChatId(e.currentTarget.value)}
            />
            <Button
              disabled={
                !botId || !chatId
              }
              onClick={onConfigureBot}
              kind="secondary"
              >
              Set Bot
            </Button>
        </Block>
        <HeadingMedium as="h1">Configure Auction Settings</HeadingMedium>
        <ParagraphSmall>
          RMRK NFT ID:
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
            value={tokenId}
            onChange={(e) => setTokenId(e.currentTarget.value)}
          />
        </Block>
        <ParagraphSmall>
          Reserve Price (KSM):
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
            value={reservePrice}
            onChange={(e) => setReservePrice(e.currentTarget.valueAsNumber)}
          />
        </Block>
        <ParagraphSmall>
          Minimum Bid Increase (KSM):
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
            value={bidIncrement}
            onChange={(e) => setBidIncrement(e.currentTarget.valueAsNumber)}
          />
        </Block>
        <Button
          disabled={
            !tokenId || !reservePrice || !bidIncrement
          }
          onClick={onConfigureAuction}
          kind="secondary"
        >
          Set Auction
        </Button>
        <Button
          overrides={{Root: {style: {margin: '16px 0'}}}}
          onClick={onStartAuction}
        >
          Start Auction
        </Button>
        <Button
          overrides={{Root: {style: {margin: '16px 0'}}}}
          onClick={onSettleAuction}
        >
          Settle Auction
        </Button>
        <HeadingMedium as="h1">Auction Bidders Section</HeadingMedium>
        <ParagraphSmall>
          Bid Price (KSM):
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
            value={reservePrice}
            onChange={(e) => setBidIncrement(e.currentTarget.valueAsNumber)}
          />
        </Block>
        <Button
          disabled={
            !reservePrice
          }
          onClick={onBid}
          kind="secondary"
        >
          Submit Bid
        </Button>

        <HeadingMedium as="h1">Auction Queries</HeadingMedium>

        <Button
          overrides={{Root: {style: {margin: '16px 0'}}}}
          onClick={getTokenId}
        >
          RMRK NFT ID
        </Button>
        <Button
          overrides={{Root: {style: {margin: '16px 0'}}}}
          onClick={getReservePrice}
        >
          Current Bid
        </Button>
        <Button
          overrides={{Root: {style: {margin: '16px 0'}}}}
          onClick={auctionStatus}
        >
          Auction Status
        </Button>

      </>
    ) : (
      <Button disabled={!account} onClick={onSignCertificate}>
        Sign Certificate
      </Button>
    )
  ) : (
    <ContractLoader
      name="phatAuction"
      onLoad={({api, contract}) => {
        setApi(api)
        setContract(contract)
      }}
    />
  )
}

PhatAuction.title = 'Phat Auction'

export default PhatAuction
