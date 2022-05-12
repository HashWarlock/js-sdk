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
        if (!certificateData || !contract || !account) return
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
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }

    const onChooseHandCzarMove = async () => {
        const toastKey = toaster.info('Inquiring The Hand Czars Availability...', {
            autoHideDuration: 0,
        })
        if (!certificateData || !contract || !account) return
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
                    }
                })
        } catch (err) {
            toaster.clear(toastKey)
            toaster.negative((err as Error).message, {})
        }
    }
}

Roshambo.title = 'Challenge The Hand Czar'

export default Roshambo