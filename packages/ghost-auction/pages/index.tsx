import type {NextPage} from 'next'
import Head from 'next/head'
import Link from 'next/link'
import {StyledLink} from 'baseui/link'

const LINKS: [string, string][] = [
  ['/ghost-auction', 'Configure Ghost Auction'],
]

const Home: NextPage = () => {
  return (
    <div>
      <Head>
        <title>Phala NFT Ghost Auction</title>
      </Head>

      <Link href="/template" passHref>
        <StyledLink>Configuration</StyledLink>
      </Link>

      <ol>
        {LINKS.map(([href, label], index) => (
          <li key={href}>
            <Link href={href} passHref>
              <StyledLink>{label}</StyledLink>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default Home
