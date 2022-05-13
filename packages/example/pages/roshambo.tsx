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

const Roshambo: Page = () {
    // Basic states for contract interaction
    const [account] = useAtom(accountAtom)
    const [certificateData, setCertificateData] = useState<CertificateData>()
    const [api, setApi] = useState<ApiPromise>()
    const [contract, setContract] = useState<ContractPromise>()

    // UI Specific
    const [handCzarMove, setHandCzarMove] = useState(0)
    const [challengerMove, setChallengerMove] = useState(0)
    const [gameSettled, setGameSettled] = useState(true)
    const [gameId, setGameId] = useState(0)
    const [queryGameId, setQueryGameId] = useState(0)
    const [handCzarWins, setHandCzarWins] = useState(0)
    const [handCzarLosses, setHandCzarLosses] = useState(0)

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

    const onGetResults = async () => {
        if (!certificateData || !contract) return
        const {output} = await contract.query.results(certificateData as any, {}, gameId)
        console.log(output?.toHuman())
        toaster.info(JSON.stringify(output?.toHuman()), {})
    }

    const onChallengeHandCzar = async () => {
        if (!certificateData || !contract || !account || gameSettled) return
        const toastKey = toaster.info('Inquiring The Hand Czars Availability...', {
            autoHideDuration: 0,
        })
        try {
            const signer = await getSigner(account)
            await contract.tx
                .challengeHandCzar({})
                .signAndSend(account.address, {signer}, (status) => {
                    if (status.isFinalized) {
                        toaster.clear(toastKey)
                        toaster.positive('Hand Czar Accepts The Challenge', {})
                        const newGameId = gameId + 1
                        setGameId(newGameId)
                        setGameSettled(false)
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }

    const onChooseHandCzarMove = async () => {
        if (!certificateData || !contract || !account || gameSettled) return
        const toastKey = toaster.info('Validating your move...', {
            autoHideDuration: 0,
        })
        try {
            const signer = await getSigner(account)
            await contract.tx
                .chooseAMove({}, handCzarMove)
                .signAndSend(account.address, {signer}, (status) => {
                    if (status.isFinalized) {
                        toaster.clear(toastKey)
                        toaster.positive('Your move is finalized.', {})
                        setHandCzarMove(handCzarMove)
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }

    const onChooseChallengerMove = async () => {
        if (!certificateData || !contract || !account || gameSettled) return
        const toastKey = toaster.info('Validating your move...', {
            autoHideDuration: 0,
        })
        try {
            const signer = await getSigner(account)
            await contract.tx
                .chooseAMove({}, challengerMove)
                .signAndSend(account.address, {signer}, (status) => {
                    if (status.isFinalized) {
                        toaster.clear(toastKey)
                        toaster.positive('Your move is finalized.', {})
                        setChallengerMove(challengerMove)
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }

    const onBootChallenger = async () => {
        if (!certificateData || !contract || !account || gameSettled) return
        const toastKey = toaster.info('Booting inactive challenger...', {
            autoHideDuration: 0,
        })
        try {
            const signer = await getSigner(account)
            await contract.tx
                .bootChallenger({})
                .signAndSend(account.address, {signer}, (status) => {
                    if (status.isFinalized) {
                        toaster.clear(toastKey)
                        toaster.positive('Your move is finalized.', {})
                        setChallengerMove(0)
                        setHandCzarMove(0)
                        setGameSettled(true)
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }

    const onSettleGame = async () => {
        if (!certificateData || !contract || !account || gameSettled) return
        const toastKey = toaster.info('Finalizing Game...', {
            autoHideDuration: 0,
        })
        try {
            const signer = await getSigner(account)
            await contract.tx
                .bootChallenger({})
                .signAndSend(account.address, {signer}, (status) => {
                    if (status.isFinalized) {
                        toaster.clear(toastKey)
                        toaster.positive('Your move is finalized.', {})
                        setChallengerMove(0)
                        setHandCzarMove(0)
                        setGameSettled(true)
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
        if (gameSettled) {
            const wins = await contract.query.getHandCzarWins(
                certificateData as any,
                {}
            )
            setHandCzarWins(wins)
            const losses = await contract.query.getHandCzarLosses(
                certificateData as any,
                {}
            )
            setHandCzarLosses(losses)
            console.log(`Hand Czar Record is ${wins} - ${losses}`)
        }
    }

    return contract ? (
        certificateData ? (
            <>
                <HeadingMedium as="h1">Challenge The Hand Czar</HeadingMedium>
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
                    Get Game ID Winner
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
            name="roshambo"
            onLoad={({api, contract}) => {
                setApi(api)
                setContract(contract)
            }}
        />
    )
}

Roshambo.title = 'Challenge The Hand Czar'

export default Roshambo