import type {ApiPromise} from '@polkadot/api'
import {ContractPromise} from '@polkadot/api-contract'
import {useEffect, useState} from 'react'
import {signCertificate, CertificateData} from '@phala/sdk'
import {Button} from 'baseui/button'
import {ButtonGroup} from 'baseui/button-group'
import {Block} from 'baseui/block'
import {Input} from 'baseui/input'
import {toaster} from 'baseui/toast'
import {
  HeadingMedium,
  LabelSmall,
  MonoParagraphXSmall,
  ParagraphSmall,
} from 'baseui/typography'
import {useAtom} from 'jotai'
import accountAtom from '../atoms/account'
import {getSigner} from '../lib/polkadotExtension'
import ContractLoader from '../components/ContractLoader'
import {Select} from 'baseui/select'
import {FormControl} from 'baseui/form-control'

const PhatRpc: Page = () => {
  const [account] = useAtom(accountAtom)
  const [certificateData, setCertificateData] = useState<CertificateData>()
  const [api, setApi] = useState<ApiPromise>()
  const [contract, setContract] = useState<ContractPromise>()
  const [apiKey, setApiKey] = useState<string>('')
  const [accountId, setAccountId] = useState<string>('')
  const [chain, setChain] = useState<string>('')
  const [queryChain, setQueryChain] = useState<string>('')
  const [value, setValue] = useState([])
  const [queryValue, setQueryValue] = useState([])
  const dropDownOptions = [
    {label: 'Astar', value: 'astar'},
    {label: 'Encointer', value: 'encointer'},
    {label: 'Centrifuge Parachain', value: 'centrifuge-api'},
    {label: 'Moonriver', value: 'moonriver'},
    {label: 'Statemine', value: 'statemine'},
    {label: 'Statemint', value: 'statemint'},
    {label: 'Mangata X', value: 'mangata-x'},
    {label: 'Quartz', value: 'quartz'},
    {label: 'Clover', value: 'clover'},
    {label: 'Polkadot', value: 'polkadot'},
    {label: 'Edgeware', value: 'edgeware'},
    {label: 'Bifrost', value: 'bifrost'},
    {label: 'Turing Network', value: 'turing-network'},
    {label: 'Basilisk', value: 'basilisk'},
    {label: 'Calamari', value: 'calamari'},
    {label: 'Acala', value: 'acala'},
    {label: 'Karura', value: 'karura'},
    {label: 'Kusama', value: 'kusama'},
    {label: 'Moonbeam', value: 'moonbeam'},
    {label: 'Parallel', value: 'parallel'},
    {label: 'Shiden', value: 'shiden'},
    {label: 'Altair', value: 'altair'},
    {label: 'Nodle Parachain', value: 'nodle-parachain'},
    {label: 'Sora', value: 'sora'},
    {label: 'Kintsugi', value: 'kintsugi'},
    {label: 'Parallel Heiko', value: 'parallel-heiko'},
    {label: 'Robonomics', value: 'robonomics'},
    {label: 'Khala', value: 'khala'},
    {label: 'Darwinia Crab', value: 'darwinia-crab'},
    {label: 'Integritee Parachain', value: 'integritee-parachain'},
    {label: 'Crust', value: 'crust'},
    {label: 'Zeitgeist', value: 'zeitgeist'},
  ]

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

  const onSetChainInfo = async (setChain: string, account_id: string) => {
    if (!certificateData || !contract || !account) return
    const toastKey = toaster.info("Setting chain's RPC Node...", {
      autoHideDuration: 0,
    })
    console.log(chain?.toString())
    console.log(setChain?.toString())
    try {
      const signer = await getSigner(account)
      await contract.tx
        .setChainInfo({}, chain, account_id)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive("Chain's RPC Node set successfully!", {})
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }

  const onSetApiKey = async (apiKey: string) => {
    if (!certificateData || !contract || !account) return
    const toastKey = toaster.info('Setting API key...', {
      autoHideDuration: 0,
    })
    try {
      const signer = await getSigner(account)
      await contract.tx
        .setApiKey({}, apiKey)
        .signAndSend(account.address, {signer}, (status) => {
          if (status.isFinalized) {
            toaster.clear(toastKey)
            toaster.positive('API key set successfully!', {})
          }
        })
    } catch (err) {
      toaster.clear(toastKey)
      toaster.negative((err as Error).message, {})
    }
  }

  const onGetNextNonce = async (setChain: any) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getNextNonce(
      certificateData as any,
      {},
      chain
    )
    console.log(queryChain?.toString())
    console.log(setChain?.toString())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetRuntimeVersion = async (setChain: any) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getRuntimeVersion(
      certificateData as any,
      {},
      chain
    )
    console.log(queryChain?.toString())
    console.log(setChain?.toString())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetGenesisHash = async (setChain: any) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getGenesisHash(
      certificateData as any,
      {},
      setChain
    )
    console.log(queryChain?.toString())
    console.log(setChain?.toString())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetApiKey = async () => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getApiKey(certificateData as any, {})
    const outputJson = output?.toJSON() as any
    console.log(output?.toHuman())
    if (outputJson.ok) {
      toaster.info(JSON.stringify(output?.toHuman()), {})
    } else {
      toaster.negative(outputJson.err, {})
    }
  }

  const onGetRpcEndpoint = async (setChain: any) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getRpcEndpoint(
      certificateData as any,
      {},
      chain
    )
    console.log(queryChain?.toString())
    console.log(setChain?.toString())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  const onGetChainAccountId = async (setChain: any) => {
    if (!certificateData || !contract) return
    const {output} = await contract.query.getChainAccountId(
      certificateData as any,
      {},
      chain
    )
    console.log(queryChain?.toString())
    console.log(setChain?.toString())
    toaster.info(JSON.stringify(output?.toHuman()), {})
  }

  return contract ? (
    certificateData ? (
      <>
        <HeadingMedium as="h2">Set API Key</HeadingMedium>
        <ParagraphSmall>
          API Key (XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX):
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
            onChange={(e) => setApiKey(e.currentTarget.value)}
          />
          <Button
            onClick={() => {
              onSetApiKey(apiKey)
            }}
            kind="secondary"
          >
            Configure
          </Button>
        </Block>

        <HeadingMedium as="h2">Configure Chain Account ID</HeadingMedium>
        <FormControl label="Chain">
          <Select
            size="compact"
            placeholder="Select"
            options={dropDownOptions}
            getOptionLabel={({option}) =>
              option && (
                <>
                  <LabelSmall>{option.label}</LabelSmall>
                  <MonoParagraphXSmall as="div">
                    {option.label}
                  </MonoParagraphXSmall>
                </>
              )
            }
            getValueLabel={({option}) => (
              <>
                <LabelSmall>{option.label}</LabelSmall>
                <MonoParagraphXSmall as="div">
                  {option.label}
                </MonoParagraphXSmall>
              </>
            )}
            searchable={false}
            labelKey="label"
            valueKey="value"
            value={value}
            onChange={(params) => {
              setChain(params.option?.value)
              setValue(params.value)
            }}
            overrides={{Root: {style: {width: '200px'}}}}
          ></Select>
        </FormControl>
        <ParagraphSmall>Account ID (SS58 Format):</ParagraphSmall>

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
            onChange={(e) => setAccountId(e.currentTarget.value)}
          />
          <Button
            onClick={() => {
              onSetChainInfo(chain, accountId)
            }}
            kind="secondary"
          >
            Configure
          </Button>
        </Block>

        <HeadingMedium marginTop="scale1000" as="h2">
          Account Functions
        </HeadingMedium>
        <ParagraphSmall>Query Chain RPC Nodes</ParagraphSmall>
        <FormControl label="Chain">
          <Select
            size="compact"
            placeholder="Select"
            options={dropDownOptions}
            getOptionLabel={({option}) =>
              option && (
                <>
                  <LabelSmall>{option.label}</LabelSmall>
                  <MonoParagraphXSmall as="div">
                    {option.label}
                  </MonoParagraphXSmall>
                </>
              )
            }
            getValueLabel={({option}) => (
              <>
                <LabelSmall>{option.label}</LabelSmall>
                <MonoParagraphXSmall as="div">
                  {option.label}
                </MonoParagraphXSmall>
              </>
            )}
            searchable={false}
            labelKey="label"
            valueKey="value"
            value={queryValue}
            onChange={(params) => {
              setQueryChain(params.option?.value)
              setQueryValue(params.value)
            }}
            overrides={{Root: {style: {width: '200px'}}}}
          ></Select>
        </FormControl>
        <ParagraphSmall>Query Functions</ParagraphSmall>
        <ButtonGroup>
          <Button
            disabled={!queryChain}
            onClick={() => {
              onGetRpcEndpoint(queryChain)
            }}
          >
            RPC Endpoint
          </Button>
          <Button
            disabled={!queryChain}
            onClick={() => {
              onGetChainAccountId(queryChain)
            }}
          >
            Chain Account ID
          </Button>
          <Button
            disabled={!queryChain}
            onClick={() => {
              onGetNextNonce(queryChain)
            }}
          >
            Next Nonce
          </Button>
          <Button
            disabled={!queryChain}
            onClick={() => {
              onGetGenesisHash(queryChain)
            }}
          >
            Genesis Hash
          </Button>
          <Button
            disabled={!queryChain}
            onClick={() => {
              onGetRuntimeVersion(queryChain)
            }}
          >
            Runtime Version
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
      name="phatRpc"
      onLoad={({api, contract}) => {
        setApi(api)
        setContract(contract)
      }}
    />
  )
}

PhatRpc.title = 'Phat RPC'

export default PhatRpc
