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

const baseURL = '/'
const CONTRACT_ID = 102

const OffChainAuctionBot = ({api, phala}: {api: ApiPromise; phala: PhalaInstance}) => {
    const [account] = useAtom(accountAtom)
    const [token, setToken] = useState('')
    const [chatId, setChatId] = useState('')
    const [bidder, setBidder] = useState('')
    const [nftPrice, setNftPrice] = useState('0.1')
    const [nftId, setNftId] = useState('')
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
        (type: 'queryOwner' | 'queryBotToken' | 'queryChatId' | 'queryNftPrice') => {
            if (!certificateData) return
            const resultKeyMap: Record<typeof type, string> = {
                queryOwner: 'owner',
                queryBotToken: 'botToken',
                queryChatId: 'chatId',
                queryNftPrice: 'nftPrice',
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
        [phala, api, certificateData]
    )

    const command = useCallback(
        (
            type: 'SetOwner' | 'SetupBot' | 'SendAuctionBid'
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
                                            : { bidder, ksm: nftPrice, nft_id: nftId},
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
        [account, api, owner, phala, token, chatId, bidder, nftPrice, nftId]
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

                    <form onSubmit={command('SendAuctionBid')}>
                        <FormControl label="KSM Wallet ID">
                            <Input
                                autoFocus
                                value={bidder}
                                onChange={(e) => setBidder(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <FormControl label="KSM Bid Amount">
                            <Input
                                autoFocus
                                value={nftPrice}
                                onChange={(e) => setNftPrice(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <FormControl label="NFT ID">
                            <Input
                                autoFocus
                                value={nftId}
                                onChange={(e) => setNftId(e.currentTarget.value)}
                                overrides={{Root: {style: {width: '500px'}}}}
                            ></Input>
                        </FormControl>

                        <Button type="submit" disabled={!bidder || !nftPrice || !nftId}>
                            Send Auction Bid
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
                            <Button onClick={() => query('queryOwner')}>Query Owner</Button>
                            <Button onClick={() => query('queryBotToken')}>
                                Query Bot Token
                            </Button>
                            <Button onClick={() => query('queryChatId')}>
                                Query Chat Id
                            </Button>
                            <Button onClick={() => query('queryNftPrice')}>
                                Query Current NFT Bid Price
                            </Button>
                        </ButtonGroup>
                    </Block>
                </div>
            </Step>
        </ProgressSteps>
    )
}

const OffChainAuctionBotPage: Page = () => {
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
                SendAuctionBid: {
                    bidder: 'String',
                    ksm: 'String',
                    nft_id: 'String',
                },
                BotError: {
                    _enum: ['OriginUnavailable', 'NotAuthorized'],
                },
                BotRequestData: {
                    _enum: ['QueryOwner', 'QueryBotToken', 'QueryChatId', 'QueryNftPrice'],
                },
                BotResponseData: {
                    _enum: {
                        Owner: 'AccountId',
                        BotToken: 'String',
                        ChatId: 'String',
                        NftPrice: 'String',
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
                        SendAuctionBid: 'SendAuctionBid',
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
        return <OffChainAuctionBot api={api} phala={phala} />
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

OffChainAuctionBotPage.title = 'Off-Chain Auction Bot'

export default OffChainAuctionBotPage
