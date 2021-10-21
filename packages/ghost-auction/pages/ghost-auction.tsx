import type {ApiPromise} from '@polkadot/api'
import {numberToHex, hexAddPrefix, u8aToHex} from '@polkadot/util'
import {createApi} from 'lib/polkadotApi'
import {FormEventHandler, useCallback, useEffect, useRef, useState} from 'react'
import {
    create as createPhala,
    randomHex,
    signCertificate,
    CertificateData,
    PhalaInstance,
} from '@phala/sdk'
import {Input} from 'baseui/input'
import {Button} from 'baseui/button'
import {toaster} from 'baseui/toast'
import {useAtom} from 'jotai'
import accountAtom from 'atoms/account'
import {getSigner} from 'lib/polkadotExtension'
import {FormControl} from 'baseui/form-control'
import {ProgressSteps, Step} from 'baseui/progress-steps'
import {LabelXSmall, ParagraphMedium} from 'baseui/typography'
import {StyledSpinnerNext} from 'baseui/spinner'
import {Block} from 'baseui/block'
import {ButtonGroup} from 'baseui/button-group'
import {decodeAddress} from '@polkadot/util-crypto'

const CONTRACT_ID = 281
const baseURL = '/'

const GhostAuctioneerBot = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
    const [account] = useAtom(accountAtom)
    const [token, setToken] = useState('')
    const [chatId, setChatId] = useState('')
    const [nftId, setNftId] = useState('9544470-c242166657ef41f61c-LOX47-HASHWARLOCK-0000000000000001')
    const [topBid, setReservePrice] = useState<number>(1)
    const [autoBidIncrease, setAutoBidIncrease] = useState<number>(1)
    const [certificateData, setCertificateData] = useState<CertificateData>()
    const [signCertificateLoading, setSignCertificateLoading] = useState(false)
    const [owner, setOwner] = useState('')
    const unsubscribe = useRef<() => void>()

    useEffect(() => {
        const _unsubscribe = unsubscribe.current
        return () => {
            api?.disconnect()
            _unsubscribe?.()
        }
    }, [api])

    useEffect(() => {
        setCertificateData(undefined)
    }, [account])

    const onSignCertificate = useCallback(async () => {
        if (account) {
            setSignCertificateLoading(true)
            try {
                const signer = await getSigner(account)
                setCertificateData(
                    await signCertificate({
                        api,
                        address: account.address,
                        signer,
                    })
                )
                toaster.positive('Certificate signed', {})
            } catch (err) {
                toaster.negative((err as Error).message, {})
            }
            setSignCertificateLoading(false)
        }
    }, [api, account])

    const query = useCallback(
        (type: 'queryOwner' | 'queryBotToken' | 'queryChatId' | 'queryNft' | 'queryNftNextPrice' ) => {
            if (!certificateData) return
            const resultKeyMap: Record<typeof type, string> = {
                queryOwner: 'owner',
                queryBotToken: 'botToken',
                queryChatId: 'chatId',
                queryNft: 'nftId',
                queryNftNextPrice: 'nextPrice',
            }
            const encodedQuery = api
                .createType('BotRequest', {
                    head: {
                        id: numberToHex(CONTRACT_ID, 256),
                        nonce: hexAddPrefix(randomHex(32)),
                    },
                    data: {[type]: null},
                })
                .toHex()

            const toastKey = toaster.info('Querying…', {autoHideDuration: 0})

            phala
                .query(encodedQuery, certificateData)
                .then((data) => {
                    const {
                        result: {ok, err},
                    } = api.createType('BotResponse', hexAddPrefix(data)).toJSON() as any

                    if (ok) {
                        const result = ok[resultKeyMap[type]]
                        toaster.update(toastKey, {
                            children: result,
                            autoHideDuration: 3000,
                        })
                    }

                    if (err) {
                        throw new Error(err)
                    }
                })
                .catch((err) => {
                    toaster.update(toastKey, {
                        kind: 'negative',
                        children: (err as Error).message,
                        autoHideDuration: 3000,
                    })
                })
        },
        [phala, api, certificateData ]
    )

    const command = useCallback(
        (
            type: 'SetOwner' | 'SetupBot' | 'SetupGhostAuction'
        ): FormEventHandler<HTMLButtonElement | HTMLFormElement> =>
            async (e) => {
                e?.preventDefault()
                if (!account) return
                const toastKey = toaster.info('Sending…', {autoHideDuration: 0})
                const signer = await getSigner(account)
                try {
                    const _unsubscribe = await phala.command({
                        account,
                        contractId: CONTRACT_ID,
                        payload: api
                            .createType('BotCommand', {
                                [type]:
                                    type === 'SetOwner'
                                        ? {owner: u8aToHex(decodeAddress(owner))}
                                        : type === 'SetupBot'
                                            ? {token, chat_id: chatId}
                                            : { nft_id: nftId, reserve_price: topBid, auto_bid_increase: autoBidIncrease}
                            })
                            .toHex(),
                        signer,
                        onStatus: (status) => {
                            if (status.isFinalized) {
                                toaster.update(toastKey, {
                                    kind: 'positive',
                                    children: 'Command Sent',
                                    autoHideDuration: 3000,
                                })
                            }
                        },
                    })

                    if (_unsubscribe) {
                        unsubscribe.current = _unsubscribe
                    }
                } catch (err) {
                    toaster.update(toastKey, {
                        kind: 'negative',
                        children: (err as Error).message,
                        autoHideDuration: 3000,
                    })
                }
            },
        [account, api, owner, phala, token, chatId, nftId, topBid, autoBidIncrease]
    )

    return (
        <ProgressSteps
            current={certificateData ? 1 : 0}
            overrides={{
                Root: {
                    style: {width: '100%'},
                },
            }}
        >
            <Step title="Sign Certificate">
                <ParagraphMedium>Click to sign a certificate first.</ParagraphMedium>
                <Button
                    isLoading={signCertificateLoading}
                    onClick={onSignCertificate}
                    disabled={!account}
                >
                    Sign Certificate
                </Button>
            </Step>
            <Step title="Setup Bot">
                <div>
                    <form onSubmit={command('SetupBot')}>
                        <FormControl label="Bot Token">
                            <Input
                                autoFocus
                                value={token}
                                onChange={(e) => setToken(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <FormControl label="Chat Id">
                            <Input
                                value={chatId}
                                onChange={(e) => setChatId(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <Button type="submit" disabled={!token || !chatId}>
                            Setup
                        </Button>
                    </form>

                    <form onSubmit={command('SetupGhostAuction')}>
                        <FormControl label="RMRK NFT ID">
                            <Input
                                autoFocus
                                value={nftId}
                                onChange={(e) => setNftId(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <FormControl label="NFT Reserve Price (KSM)">
                            <Input
                                autoFocus
                                value={topBid}
                                onChange={(e) => setReservePrice(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <FormControl label="Auto Bid Increase (Decimal Format)">
                            <Input
                                autoFocus
                                value={autoBidIncrease}
                                onChange={(e) => setAutoBidIncrease(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <Button type="submit" disabled={!nftId}>
                            Submit New Ghost Auction
                        </Button>
                    </form>



                    <form onSubmit={command('SetOwner')}>
                        <FormControl label="Set Owner">
                            <Input
                                value={owner}
                                onChange={(e) => setOwner(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>
                        <Button type="submit" disabled={!owner}>
                            Set
                        </Button>
                    </form>

                    <Block marginTop="16px">
                        <ButtonGroup size="mini">
                            <Button onClick={() => query('queryOwner')}>
                                Query Owner
                            </Button>
                            <Button onClick={() => query('queryBotToken')}>
                                Query Bot Token
                            </Button>
                            <Button onClick={() => query('queryChatId')}>
                                Query Chat Id
                            </Button>
                            <Button onClick={() => query('queryNft')}>
                                Query Current NFT Id in Auction
                            </Button>
                            <Button onClick={() => query('queryNftNextBidPrice')}>
                                Query Next Expected Bid Price
                            </Button>
                        </ButtonGroup>
                    </Block>
                </div>
            </Step>
        </ProgressSteps>
    )
}

const GhostAuctioneerBotPage: Page = () => {
    const [api, setApi] = useState<ApiPromise>()
    const [phala, setPhala] = useState<PhalaInstance>()

    useEffect(() => {
        createApi({
            endpoint: process.env.NEXT_PUBLIC_WS_ENDPOINT as string,
            types: {
                ContractOwner: {owner: 'AccountId'},
                SetupBot: {
                    token: 'String',
                    chat_id: 'String',
                },
                SetupGhostAuction: {
                    nft_id: 'String',
                    reserve_price: 'u64',
                    auto_bid_increase: 'u64',
                },
                BotError: {
                    _enum: ['OriginUnavailable', 'NotAuthorized', 'NoAuctionDetected', 'NoNftDetected'],
                },
                BotRequestData: {
                    _enum: ['QueryOwner', 'QueryBotToken', 'QueryChatId', 'QueryNft', 'QueryNftNextBidPrice'],
                },
                BotResponseData: {
                    _enum: {
                        Owner: 'AccountId',
                        BotToken: 'String',
                        ChatId: 'String',
                        Nft: 'String',
                        NextBidPrice: 'u64',
                    },
                },
                BotRequest: {
                    head: 'ContractQueryHead',
                    data: 'BotRequestData',
                },
                BotResponse: {
                    nonce: '[u8; 32]',
                    result: 'Result<BotResponseData, BotError>',
                },
                BotCommand: {
                    _enum: {
                        SetOwner: 'ContractOwner',
                        SetupBot: 'SetupBot',
                        SetupGhostAuction: 'SetupGhostAuction',
                        //SubmitBid: null,
                        //SettleAuction: null,
                    },
                },
            },
        })
            .then((api) => {
                setApi(api)
                return createPhala({api, baseURL}).then((phala) => {
                    setPhala(() => phala)
                })
            })
            .catch((err) => {
                toaster.negative((err as Error).message, {})
            })
    }, [])

    if (api && phala) {
        return <GhostAuctioneerBot api={api} phala={phala} />
    }

    return (
        <Block
            display="flex"
            flexDirection="column"
            alignItems="center"
            height="280px"
            justifyContent="center"
        >
            <StyledSpinnerNext />
            <LabelXSmall marginTop="20px">Initializing</LabelXSmall>
        </Block>
    )
}

GhostAuctioneerBotPage.title = 'NFT Ghost Auctioneer Bot'

export default GhostAuctioneerBotPage
