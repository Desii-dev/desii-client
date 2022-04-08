import { Box } from '@chakra-ui/react'
import { signOut } from 'next-auth/react'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useContext, useMemo, VFC } from 'react'
import { GuestUserIcon, UserIcon } from '~/components/domains/user/UserIcon'
import { Button, Link, Menu, SolidIcon } from '~/components/parts/commons'
import { LoginModalSetIsOpenContext } from '~/hooks'
import { CurrentUserContext } from '~/hooks/CurrentUserProvider'
import { User } from '~/types/generated/graphql'

type Props = {
  currentUser?: User | null
  isLoading: boolean
  onClickButton: () => void
}

export const Component: VFC<Props> = ({
  currentUser,
  isLoading,
  onClickButton,
}) => {
  const router = useRouter()

  const iconContent = useMemo(() => {
    if (!currentUser && !isLoading)
      return <Button onClick={onClickButton}>ログイン</Button>

    if (!currentUser) return <GuestUserIcon size="sm" />

    return (
      <Box display="flex" alignItems="center" gap="20px">
        <Box cursor="pointer" position="relative" _hover={{ opacity: 0.7 }}>
          <SolidIcon icon="SOLID_BELL" size={30} />
          <Box
            position="absolute"
            top="-6px"
            right="-6px"
            bgColor="error.main"
            color="white.main"
            borderRadius="50%"
            fontSize="xs"
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="20px"
            minWidth="20px"
            fontWeight="bold"
            padding="4px"
          >
            99
          </Box>
        </Box>
        <Menu
          toggleItem={<UserIcon user={currentUser} size="sm" />}
          menuList={[
            {
              text: 'プロフィール',
              icon: <UserIcon user={currentUser} size="xs" />,
              onClick: () => router.push(`/user/${currentUser.id}`),
            },
            {
              text: '投稿を作成',
              icon: <SolidIcon icon="SOLID_PENCIL_ALT" size={20} />,
              onClick: () => router.push('/dashboard/posts/new'),
            },
            {
              text: '投稿の管理',
              icon: <SolidIcon icon="SOLID_DOCUMENT_TEXT" size={20} />,
              onClick: () => router.push('/dashboard/posts'),
            },
            {
              text: 'いいねした投稿',
              icon: <SolidIcon icon="SOLID_STAR" size={20} />,
              onClick: () => router.push('/dashboard/favorites'),
            },
            {
              text: 'ログアウト',
              icon: <SolidIcon icon="SOLID_LOGOUT" size={20} />,
              onClick: () => signOut(),
            },
          ]}
        />
      </Box>
    )
  }, [router, currentUser, isLoading, onClickButton])

  return (
    <Box
      width="100%"
      p="12px"
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      bgColor="#fff"
    >
      <Link href="/">
        <Box width="100px">
          <Image
            src="/images/Desii_logo.svg"
            alt="Desii_logo"
            width="300"
            height="100"
          />
        </Box>
      </Link>
      <Box>{iconContent}</Box>
    </Box>
  )
}

export const NavigationBar: VFC = () => {
  const { currentUser, isLoading } = useContext(CurrentUserContext)
  const setIsOpen = useContext(LoginModalSetIsOpenContext)

  return (
    <Component
      currentUser={currentUser}
      isLoading={isLoading}
      onClickButton={() => setIsOpen(true)}
    />
  )
}
