import {ApiPromise} from '@polkadot/api'
import {ContractPromise} from '@polkadot/api-contract'
import {useEffect, useState} from 'react'
import {signCertificate, CertificateData} from '@phala/sdk'
import {Button} from 'baseui/button'
import {toaster} from 'baseui/toast'
import {HeadingMedium} from 'baseui/typography'
import {useAtom} from 'jotai'
import accountAtom from '../atoms/account'
import {getSigner} from '../lib/polkadotExtension'
import ContractLoader from '../components/ContractLoader'

const Roshambo: Page = () => {
  // Basic states for contract interaction
  const [account] = useAtom(accountAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [api, setApi] = useState<ApiPromise>()
  const [contract, setContract] = useState<ContractPromise>()

  // UI Specific
  const [handCzarMove, setHandCzarMove] = useState<boolean>()
  const [challengerMove, setChallengerMove] = useState<boolean>()
  const [gameSettled, setGameSettled] = useState<boolean>()
  const [gameId, setGameId] = useState<number>() || 0
  const [handCzarWins, setHandCzarWins] = useState<number>()
  const [handCzarLosses, setHandCzarLosses] = useState<number>()

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
        setGameId((await onGetGameId()) as number)
        setHandCzarMove((await onGetHandCzarMoveStatus()) as boolean)
        setChallengerMove((await onGetChallengerMoveStatus()) as boolean)
        setGameSettled((await onIsGameSettled()) as boolean)
        setHandCzarWins((await onGetHandCzarWins()) as number)
        setHandCzarLosses((await onGetHandCzarLosses()) as number)
      } catch (err) {
        toaster.negative((err as Error).message, {})
      }
    }
  }

  const onGetResults = async (queryGameId: number) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.results(
      certificateData as any,
      {},
      queryGameId
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output
  }

  const onGetHandCzarMoveStatus = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getHandCzarMoveStatus(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as boolean
  }

  const onGetChallengerMoveStatus = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getChallengerMoveStatus(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as boolean
  }

  const onIsGameSettled = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.isGameSettled(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as boolean
  }

  const onGetGameId = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getGameId(certificateData as any, {})
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as number
  }

  const onGetHandCzarWins = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getHandCzarWins(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as number
  }

  const onGetHandCzarLosses = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getHandCzarLosses(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
    return output as unknown as number
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
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
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

  const onChooseHandCzarMove = async (move: number) => {
    if (
      !certificateData ||
      !contract ||
      !account ||
      gameSettled ||
      handCzarMove
    )
      return
    const toastKey = toaster.info('Validating your move...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .chooseAMove({}, move)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Your move is finalized.', {})
            setHandCzarMove(true)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }

  const onChooseChallengerMove = async (move: number) => {
    if (
      !certificateData ||
      !contract ||
      !account ||
      gameSettled ||
      challengerMove
    )
      return
    const toastKey = toaster.info('Validating your move...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .chooseAMove({}, move)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Your move is finalized.', {})
            setChallengerMove(true)
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
            setChallengerMove(false)
            setHandCzarMove(false)
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
        .settleGame({})
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('Your move is finalized.', {})
            setChallengerMove(false)
            setHandCzarMove(false)
            setGameSettled(true)
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
    if (gameSettled) {
      setHandCzarWins((await onGetHandCzarWins()) as number)
      setHandCzarLosses((await onGetHandCzarLosses()) as number)
      toaster.clear(toastKey)
      toaster.positive(
        `Hand Czar Record is ${handCzarWins}-${handCzarLosses}`,
        {}
      )
    }
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h1">Challenge The Hand Czar</HeadingMedium>
        <HeadingMedium as="h2">
          Hand Czar Record ${handCzarWins}-${handCzarLosses}
        </HeadingMedium>
        <HeadingMedium as="h2">Challenge The Hand Czar?</HeadingMedium>
        <Button
          disabled={!gameSettled}
          onClick={onChallengeHandCzar}
        >
          Send Challenge
        </Button>
        <HeadingMedium as="h2">Challenger Commands</HeadingMedium>
        <Button
          disabled={gameSettled || challengerMove}
          onClick={() => {
            onChooseChallengerMove(1)
          }}
        >
          Rock
        </Button>
        <Button
          disabled={gameSettled || challengerMove}
          onClick={() => {
            onChooseChallengerMove(2)
          }}
        >
          Paper
        </Button>
        <Button
          disabled={gameSettled || challengerMove}
          onClick={() => {
            onChooseChallengerMove(3)
          }}
        >
          Scissors
        </Button>
        <HeadingMedium as="h2">Hand Czar Commands</HeadingMedium>
        <Button
          disabled={gameSettled || handCzarMove}
          onClick={() => {
            onChooseHandCzarMove(1)
          }}
        >
          Rock
        </Button>
        <Button
          disabled={gameSettled || handCzarMove}
          onClick={() => {
            onChooseHandCzarMove(2)
          }}
        >
          Paper
        </Button>
        <Button
          disabled={gameSettled || handCzarMove}
          onClick={() => {
            onChooseHandCzarMove(3)
          }}
        >
          Scissors
        </Button>
        <HeadingMedium as="h2">Hand Czar Admin Control</HeadingMedium>
        <Button
          disabled={gameSettled || (handCzarMove && challengerMove)}
          onClick={onBootChallenger}
        >
          Rock
        </Button>
        <Button disabled={gameSettled} onClick={onSettleGame}>
          Settle Game
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
