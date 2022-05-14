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

const Roshambo: Page = () => {
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
    const {output} = await contract.query.results(
      certificateData as any,
      {},
      gameId
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetWins = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getHandCzarLosses(
      certificateData as any,
      {}
    )
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onChallengeHandCzar = async () => {
    if (!certificateData || !contract || !account || !gameSettled) return
    const toastKey = toaster.info('Inquiring The Hand Czars Availability...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .challengeHandCzar({})
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            if (!status.isError) {
              toaster.clear(toastKey)
              toaster.positive('Hand Czar Accepts The Challenge', {})
              const newGameId = gameId + 1
              setGameId(newGameId)
              setGameSettled(false)
            } else {
              toaster.clear(toastKey)
              toaster.positive(status.dispatchError, {})
            }
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
            if (!status.isError) {
              toaster.clear(toastKey)
              toaster.positive('Your move is finalized.', {})
              setHandCzarMove(handCzarMove)
            } else {
              toaster.clear(toastKey)
              toaster.positive(status.dispatchError, {})
            }
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
            if (!status.isError) {
              toaster.clear(toastKey)
              toaster.positive('Your move is finalized.', {})
              setChallengerMove(challengerMove)
            } else {
              toaster.clear(toastKey)
              toaster.positive(status.dispatchError, {})
            }
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
            if (!status.isError) {
              toaster.clear(toastKey)
              toaster.positive('Challenger booted.', {})
              setChallengerMove(0)
              setHandCzarMove(0)
              setGameSettled(true)
            } else {
              toaster.clear(toastKey)
              toaster.positive(status.dispatchError, {})
            }
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
            if (!status.isError) {
              toaster.clear(toastKey)
              toaster.positive('Game is Finalized', {})
              setChallengerMove(0)
              setHandCzarMove(0)
              setGameSettled(true)
            } else {
              toaster.clear(toastKey)
              toaster.positive(status.dispatchError, {})
            }
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
    if (gameSettled) {
      toaster.positive('Updating Hand Czar Wins and Losses...', {})
      const {wins} = await contract.query.getHandCzarWins(
        certificateData as any,
        {}
      )
      const winTotal = wins.toNumber()
      setHandCzarWins(winTotal)
      const {losses} = await contract.query.getHandCzarLosses(
        certificateData as any,
        {}
      )
      const lossTotal = losses.toNumber()
      setHandCzarLosses(lossTotal)
    }
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h1">Challenge The Hand Czar</HeadingMedium>
        <HeadingMedium as="h2">
          Hand Czar Record: {handCzarWins} - {handCzarLosses}
        </HeadingMedium>
        <Button
          disabled={!gameSettled}
          onClick={onChallengeHandCzar}
          kind="secondary"
        >
          Request Challenge
        </Button>
        <HeadingMedium as="h3">Challenger Moves:</HeadingMedium>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setChallengerMove(1)
            onChooseChallengerMove()
          }}
          kind="secondary"
        >
          Rock
        </Button>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setChallengerMove(2)
            onChooseChallengerMove
          }}
        >
          Paper
        </Button>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setChallengerMove(3)
            onChooseChallengerMove()
          }}
        >
          Scissors
        </Button>
        <HeadingMedium as="h3">Hand Czar Moves:</HeadingMedium>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setHandCzarMove(1)
            onChooseHandCzarMove()
          }}
          kind="secondary"
        >
          Rock
        </Button>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setHandCzarMove(2)
            onChooseHandCzarMove()
          }}
        >
          Paper
        </Button>
        <Button
          disabled={gameSettled}
          onClick={() => {
            setHandCzarMove(3)
            onChooseHandCzarMove()
          }}
        >
          Scissors
        </Button>
        <HeadingMedium as="h2">Hand Czar Controls</HeadingMedium>
        <Button disabled={gameSettled} onClick={onSettleGame} kind="secondary">
          Settle Game
        </Button>
        <Button
          disabled={gameSettled}
          onClick={onBootChallenger}
          kind="secondary"
        >
          Boot Challenger
        </Button>

        <HeadingMedium as="h2">Hand Czar Game Winners</HeadingMedium>

        <ParagraphSmall>Winner of Game ID:</ParagraphSmall>
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
            value={queryGameId}
            onChange={(e) => setQueryGameId(e.currentTarget.valueAsNumber)}
          />
        </Block>
        <Button onClick={onGetResults} kind="secondary">
          Query Winner
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
