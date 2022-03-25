import {
  Box,
  Image,
  Input,
  Spinner,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react'
import styled from '@emotion/styled'
import axios from 'axios'
import cuid from 'cuid'
import { GetServerSideProps, NextPage } from 'next'
import { getSession } from 'next-auth/react'
import { useRouter } from 'next/router'
import React, { ChangeEvent, FormEvent, useCallback, useState } from 'react'
import {
  Button,
  IconButton,
  Modal,
  SolidIcon,
  Tag,
  Text,
} from '~/components/parts/commons'
import { useToast } from '~/hooks'
import { initializeApollo } from '~/lib/apolloClient'
import { GET_CURRENT_USER } from '~/queries'
import { theme } from '~/theme'
import {
  GetCurrentUserQuery,
  GetCurrentUserQueryVariables,
  OrderByType,
  Post,
  PostCategory,
  Tag as TagType,
  useCreateAttachmentMutation,
  useCreatePostMutation,
  useCreateTagMutation,
  useCreateTagPostRelationMutation,
  useGetAllTagsQuery,
} from '~/types/generated/graphql'

const client = initializeApollo()

const MAX_TAGS = 5

const NewPostPage: NextPage = () => {
  const router = useRouter()
  const { toast } = useToast()
  const { isOpen, onOpen, onClose } = useDisclosure()

  const postCategoryList: { name: string; value: keyof typeof PostCategory }[] =
    [
      { name: '出来ること', value: 'GiveYou' },
      { name: 'してほしいこと', value: 'GiveMe' },
    ]

  const [value, setValue] = useState('')
  const [postTags, setPostTags] = useState<{ name: string; id: string }[]>([])
  const [newPost, setNewPost] = useState<
    Pick<Post, 'title' | 'content' | 'category' | 'isPrivate' | 'bgImage'>
  >({
    title: '',
    content: '',
    category: PostCategory.GiveYou,
    isPrivate: false,
    bgImage: undefined,
  })
  const [isUploading, setIsUploading] = useState(false)

  const { data } = useGetAllTagsQuery({
    variables: {
      sort: OrderByType.Desc,
      searchText: value,
    },
    fetchPolicy: 'cache-and-network',
  })

  const updatePost = (newObject: Partial<Post>) => {
    setNewPost((prevState) => {
      return {
        ...prevState,
        ...newObject,
      }
    })
  }

  const [createTagMutation] = useCreateTagMutation({
    refetchQueries: ['GetAllTags'],
  })

  const [createPostMutation] = useCreatePostMutation({
    variables: {
      ...newPost,
    },
  })

  const [createTagPostRelationMutation] = useCreateTagPostRelationMutation()

  const [createAttachmentMutation] = useCreateAttachmentMutation()

  const handleAddTag = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (value === '') return
      if (postTags.length >= MAX_TAGS) {
        toast({ title: 'タグは5つまでしか設定できません', status: 'warning' })
        return
      }
      if (!data) return

      const tag = data.getAllTags.find((tag) => tag.name === value)

      if (tag) {
        setPostTags([...postTags, { name: tag.name, id: tag.id }])
        setValue('')
        return
      }

      try {
        const { data: TagData } = await createTagMutation({
          variables: {
            name: value,
          },
        })
        if (!TagData) return
        setPostTags([
          ...postTags,
          { name: TagData.createTag.name, id: TagData.createTag.id },
        ])
        setValue('')
      } catch (err) {
        toast({ title: 'タグの作成に失敗しました', status: 'error' })
      }
    },
    [data, postTags, toast, value, createTagMutation]
  )

  const handleDeleteTag = (index: number) => {
    setPostTags(postTags.filter((tag, i) => i !== index))
  }

  const handleClickTagField = (tag: TagType) => {
    const res = postTags.find((t) => t.name === tag.name)

    if (res) {
      setPostTags(postTags.filter((t) => t.name !== tag.name))
      return
    }
    if (postTags.length >= MAX_TAGS) {
      toast({ title: 'タグは5つまでしか設定できません', status: 'warning' })
      return
    }
    setPostTags([...postTags, { name: tag.name, id: tag.id }])
  }

  const handleCreatePost = useCallback(async () => {
    try {
      const { data: postData } = await createPostMutation()

      if (!postData) return

      postTags.forEach((tag) => {
        // TODO: createManyを実装して置き換える
        createTagPostRelationMutation({
          variables: {
            tagId: tag.id,
            postId: postData.createPost.id,
          },
        })
      })

      toast({ title: '投稿が作成されました！', status: 'success' })
      router.push(`/post/${postData.createPost.id}`)
    } catch (err) {
      toast({ title: '投稿の作成に失敗しました', status: 'error' })
    }
  }, [
    postTags,
    toast,
    createPostMutation,
    createTagPostRelationMutation,
    router,
  ])

  const uploadFIle = useCallback(
    async (file: File) => {
      setIsUploading(true)
      try {
        const uniqueFileName = `${cuid()}/${file.name}`;
        const res = await axios.post(
          `${
            process.env.NEXT_PUBLIC_ROOT_URL || 'http://localhost:3000'
          }/api/signedUrl?fileName=${uniqueFileName}`
        )
        const signed_url = res.data[0]

        if (typeof signed_url !== 'string') return
        await axios.put(signed_url, file, {
          headers: {
            'Content-Type': 'application/octet-stream',
          },
        })
        updatePost({
          bgImage: `https://storage.googleapis.com/${
            process.env.GCP_BUCKET_ID || 'desii-dev'
          }/${uniqueFileName}`,
        })
      } catch (error) {
        console.log(error)
        toast({ title: '画像のアップロードに失敗しました！', status: 'error' })
      } finally {
        setIsUploading(false)
      }
    },
    [toast]
  )

  const handleUploadFile = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) {
      return
    }
    const file = e.target.files[0]
    await uploadFIle(file)
    e.target.value = ''
  }

  return (
    <Box p={['28px 10px 0', '40px 20px 0']}>
      <Box mx="auto" maxW="700px">
        <Box mb="32px">
          <Box mb="12px">
            <Text fontSize="md" isBold>
              タイトル
            </Text>
          </Box>
          <Input
            bgColor="white.main"
            boxShadow="0 3px 6px rgba(0, 0, 0, 0.16)"
            value={newPost.title}
            onChange={(e) => updatePost({ title: e.target.value })}
          />
        </Box>
        <Box mb="32px">
          <Box mb="12px">
            <Text fontSize="md" isBold>
              本文
            </Text>
          </Box>
          <Textarea
            bgColor="white.main"
            boxShadow="0 3px 6px rgba(0, 0, 0, 0.16)"
            rows={12}
            value={newPost.content}
            onChange={(e) => updatePost({ content: e.target.value })}
          />
        </Box>
        <Box mb="32px">
          <Box mb="12px">
            <Text fontSize="md" isBold>
              カテゴリー
            </Text>
          </Box>
          <Box
            p="8px 12px"
            bgColor="white.main"
            display="flex"
            alignItems="center"
            boxShadow="0 3px 6px rgba(0, 0, 0, 0.16)"
            borderRadius="8px"
            cursor="pointer"
            gap="4px"
          >
            {postCategoryList.map((category, i) => {
              const isSelected =
                newPost.category === PostCategory[category.value]
              return (
                <Box
                  key={i}
                  w="100%"
                  p="16px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderRadius="16px"
                  bgColor={isSelected ? 'orange.main' : 'white.main'}
                  boxShadow={
                    isSelected ? '0 3px 6px rgba(0, 0, 0, 0.16)' : 'none'
                  }
                  cursor={isSelected ? 'auto' : 'pointer'}
                  onClick={() =>
                    updatePost({ category: PostCategory[category.value] })
                  }
                >
                  <Text
                    fontSize="lg"
                    isBold
                    color={isSelected ? 'white.main' : 'text.main'}
                  >
                    {category.name}
                  </Text>
                </Box>
              )
            })}
          </Box>
        </Box>
        <Box mb="32px">
          <Box mb="12px">
            <Text fontSize="md" isBold>
              マッチングタグ
            </Text>
          </Box>
          <Button isFullWidth onClick={onOpen}>
            <Text fontSize="md" color="text.light">
              タグを検索、または作成する
            </Text>
          </Button>
          <Modal
            title="タグを追加する"
            isOpen={isOpen}
            onClose={onClose}
            body={
              <Box
                borderTop={`1px solid ${theme.colors.secondary.main}`}
                pt="12px"
                mt="-8px"
              >
                <Box mb="4px" pl="8px">
                  <Text fontSize="sm" isBold>
                    タグは、５つまで選択可能
                  </Text>
                </Box>
                <form onSubmit={(e) => handleAddTag(e)}>
                  <Input
                    bgColor="secondary.light"
                    boxShadow="0 3px 6px rgba(0, 0, 0, 0.16)"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="タグを検索、または作成する"
                  />
                </form>
                <Box mt="16px">
                  {data?.getAllTags &&
                    data.getAllTags.map((tag) => (
                      <Box
                        key={tag.id}
                        borderTop={`1px solid ${theme.colors.secondary.main}`}
                        borderRadius="4px"
                        p="8px 0"
                        cursor="pointer"
                        display="flex"
                        alignItems="center"
                        gap="4px"
                        _hover={{
                          bgColor: 'secondary.main',
                        }}
                        onClick={() => handleClickTagField(tag)}
                      >
                        <Box
                          pl="4px"
                          visibility={
                            postTags.some((pTag) => pTag.name === tag.name)
                              ? 'visible'
                              : 'hidden'
                          }
                        >
                          <SolidIcon icon="SOLID_CHECK" />
                        </Box>
                        {tag.name}
                      </Box>
                    ))}
                </Box>
              </Box>
            }
          />
          <Box mt="12px" display="flex" flexWrap="wrap" gap="8px">
            {postTags.map((tag, i) => (
              <Tag
                text={tag.name}
                key={i}
                canDelete
                onClose={() => handleDeleteTag(i)}
              />
            ))}
          </Box>
        </Box>
        <Box mb="56px">
          <Box mb="12px">
            <Text fontSize="md" isBold>
              背景画像
            </Text>
          </Box>
          {newPost.bgImage ? (
            <Box>
              <Image src={newPost.bgImage} alt="" />
            </Box>
          ) : (
            <IconButton
              icon={
                <StyledLabel htmlFor="image">
                  <SolidIcon icon="SOLID_PHOTOGRAPH" />
                  <Box display="none">
                    <input
                      type="file"
                      name="image"
                      id="image"
                      onChange={handleUploadFile}
                      accept="image/*"
                    />
                  </Box>
                  {isUploading && <Spinner />}
                </StyledLabel>
              }
              label="PHOTOGRAPH"
              isRound
            />
          )}
        </Box>
        <Box display="flex" alignItems="center" justifyContent="space-evenly">
          <Button onClick={() => router.push('/dashboard')}>キャンセル</Button>
          <Button
            onClick={handleCreatePost}
            disabled={
              newPost.title.trim().length === 0 ||
              newPost.content.trim().length === 0
            }
          >
            作成する
          </Button>
        </Box>
      </Box>
    </Box>
  )
}

const StyledLabel = styled('label')`
  cursor: pointer;
`

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  try {
    const session = await getSession(ctx)

    if (!session) {
      return {
        redirect: {
          permanent: false,
          destination: '/',
        },
      }
    }

    const {
      data: { getCurrentUser },
    } = await client.query<GetCurrentUserQuery, GetCurrentUserQueryVariables>({
      query: GET_CURRENT_USER,
      variables: {
        accessToken: session.accessToken || '',
      },
    })

    if (!getCurrentUser) {
      return {
        redirect: {
          permanent: false,
          destination: '/',
        },
      }
    }

    return {
      props: {},
    }
  } catch (error) {
    return {
      redirect: {
        permanent: false,
        destination: '/',
      },
    }
  }
}

export default NewPostPage
