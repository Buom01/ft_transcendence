<template>
	<form
		autocorrect="off"
		autocapitalize="off"
		autocomplete="off"
		spellcheck="true"
		@keydown.enter="handleCtrlEnter"
	>
		<q-editor
			class="chat-wrap"
			:placeholder="$t('chat.editor.placeholder')"
			:disable="disableForm"
			square
			:definitions="{
				send: {
					tip: $t('chat.editor.send'),
					icon: 'send',
					handler: sendMessage
				}
			}"
			:toolbar="[
				['bold', 'italic', 'strike', 'underline'],
				['undo', 'redo'],
				['send']
			]"
			v-model="editor"
		/>
	</form>

	<template v-if="loading">
		<div class="message-list">
			<q-chat-message
				avatar="imgs/no_avatar.png"
				sent
				text-color="white"
				bg-color="primary"
			>
				<q-skeleton type="text" width="150px" />
			</q-chat-message>
			<q-chat-message
				avatar="imgs/no_avatar.png"
				bg-color="amber"
			>
				<q-skeleton type="text" width="150px" />
			</q-chat-message>
		</div>
	</template>
	<template v-else>
		<div class="message-list" ref="chat">
			<template
				v-for="message in messages"
				v-bind:key="message.id"
			>
				<q-chat-message
					v-if="!blockedUser.includes(message.user.id)"
					:sent="userId === message.user.id"
					text-color="white"
					:bg-color="(userId === message.user.id) ? 'cyan-8' : 'blue-8'"
				>
					<template v-slot:name>{{ (userId !== message.user.id) ? message.user.pseudo: $t('chat.message.me') }}</template>
					<template v-slot:stamp>{{ $t('chat.channel.dateFormat', generateTimestamp(message.messages[message.messages.length - 1].timestamp)) }}</template>
					<template v-slot:avatar>
						<img
							:class="(userId === message.user.id) ? 'q-message-avatar q-message-avatar--sent' : 'q-message-avatar q-message-avatar--received'"
							:src="message.user.avatar"
							v-on:error="imageError"
						/>
					</template>
					<div
						v-for="el of message.messages"
						v-bind:key="el.id"
						:data-id="String(el.id)"
						v-html="el.content"
					></div>
				</q-chat-message>
			</template>
			<q-menu
				ref="contextmenu"
				touch-position
				context-menu
				@before-show="openContextualMenu"
			>
				<q-list bordered padding>
					<q-item
						clickable
						@click="editMessage"
					>
						<q-item-section avatar>
							<q-icon name="edit"></q-icon>
						</q-item-section>
						<q-item-section>{{ $t('chat.menu.edit') }}</q-item-section>
					</q-item>
					<q-item
						clickable
						@click="deleteMessage"
					>
						<q-item-section avatar>
							<q-icon name="delete"></q-icon>
						</q-item-section>
						<q-item-section>{{ $t('chat.menu.delete') }}</q-item-section>
					</q-item>
				</q-list>
			</q-menu>
		</div>
	</template>
</template>

<script lang="ts">
/* eslint-disable no-array-constructor */
import { Timestamp, TimestampFunction } from 'src/boot/libs';
import { Socket } from 'socket.io-client';
import { defineComponent, onMounted, ref, inject, nextTick, watch } from 'vue';
import { QMenu } from 'quasar';

interface arrayInterface {
	id: number,
	content: string,
	timestamp: string,
	modified: Date
}

interface messageInterface {
	user: {
		id: number,
		pseudo: string,
		avatar: string,
		connected: boolean
	},
	messages: arrayInterface[]
}

export default defineComponent({
	name: 'chat_channel',
	props: [
		'selectedChannelBanMut',
		'selectedChannel',
		'blockedUser',
		'userUpdate',
		'userId'
	],
	setup (props)
	{
		const socket: Socket = inject('socketChat') as Socket;
		const timestamp: TimestampFunction = inject('timestamp') as TimestampFunction;

		const contextmenu = ref<QMenu | null>(null);
		const chat = ref<HTMLDivElement | null>(null);
		const disableForm = ref<boolean>(false);
		const loading = ref(false);
		const noError = ref(true);
		const editor = ref('');
		const messages = ref(new Array<messageInterface>());
		const messageEditId = ref(-1);

		// #region Libs
		const getBottomOfChat = () =>
		{
			nextTick(() =>
			{
				if (chat.value)
					chat.value.scrollTop = chat.value.scrollHeight;
			});
		};

		const reset = () =>
		{
			loading.value = false;
			noError.value = true;
			disableForm.value = true;
			messageEditId.value = -1;
			messages.value.length = 0;
		};

		const calcHash = (str: string): string =>
		{
			let hash = 0, i: number, chr: number;
			if (str.length === 0)
				return String(hash);
			for (i = 0; i < str.length; i++)
			{
				chr = str.charCodeAt(i);
				hash = ((hash << 5) - hash) + chr;
				hash |= 0;
			}
			return String(hash);
		};

		const imageError = (e: Event) =>
		{
			const target = e.target as HTMLImageElement;
			if (target)
				target.src = 'imgs/no_avatar.png';
		};

		const generateTimestamp = (time: string) =>
		{
			const pf = (n: number) => (n < 10) ? `0${n}` : String(n);

			const messageDate: Timestamp = timestamp(time);
			return {
				year: pf(messageDate.year),
				month: pf(messageDate.month),
				day: pf(messageDate.day),
				hour: pf(messageDate.hour),
				minute: pf(messageDate.minute)
			};
		};

		const handleCtrlEnter = (event: KeyboardEvent) =>
		{
			if (event.ctrlKey)
				sendMessage();
		};
		// #endregion Libs

		// #region Get messages
		const getMessages = (channelId: string) =>
		{
			loading.value = true;
			noError.value = true;
			socket.emit('messages::get', channelId);
		};
		socket.on('messages::receive::get', (res) =>
		{
			if (res.socketId !== socket.id)
				return;
			if (!res.data)
			{
				loading.value = false;
				noError.value = false;
				return;
			}
			loading.value = false;
			const temp: messageInterface = {
				user: {
					id: 0,
					pseudo: '',
					avatar: '',
					connected: false
				},
				messages: []
			};
			let currentUser = 0;
			messages.value.length = 0;
			for (const message of res.data)
			{
				if (!currentUser ||
					(currentUser && currentUser !== message.creator.id))
				{
					if (temp.messages.length > 0)
						messages.value.push(JSON.parse(JSON.stringify(temp)));
					currentUser = Number(message.creator.id);
					temp.user.avatar = String(message.creator.avatar);
					temp.user.connected = Boolean(message.creator.connected);
					temp.user.id = Number(message.creator.id);
					temp.user.pseudo = String(message.creator.pseudo);
					temp.messages.length = 0;
				}
				temp.messages.push({
					id: Number(message.id),
					content: String(message.content),
					timestamp: message.timestamp,
					modified: message.modified
				});
			}
			if (temp.messages.length > 0)
				messages.value.push(JSON.parse(JSON.stringify(temp)));
			getBottomOfChat();
		});
		// #endregion Get messages

		// #region Send message
		const sendMessage = () =>
		{
			if (disableForm.value === true || editor.value === null || editor.value.length <= 0)
				return;
			if (props.selectedChannel.id > 0)
			{
				if (messageEditId.value === -1)
				{
					socket.emit('message::add',
						{
							id: props.userId,
							channel: props.selectedChannel.id,
							message: editor.value,
							length: editor.value.length,
							timestamp: Date.now(),
							hash: calcHash(editor.value)
						});
				}
				else
				{
					socket.emit('message::update',
						{
							id: props.userId,
							channel: props.selectedChannel.id,
							messageId: messageEditId.value,
							message: editor.value,
							length: editor.value.length,
							timestamp: Date.now(),
							hash: calcHash(editor.value)
						});
				}
			}
			editor.value = '';
			messageEditId.value = -1;
		};
		// #endregion Send message

		// #region User data change
		watch(() => props.userUpdate, () =>
		{
			if (props.userUpdate.user !== props.userId)
				return;
			disableForm.value = props.userUpdate.value;
			if (props.userUpdate.banned === true)
			{
				disableForm.value = true;
				messages.value.length = 0;
				loading.value = false;
				noError.value = true;
			}
		}, { deep: true });

		watch(() => props.selectedChannelBanMut, () =>
		{
			if (props.userId === props.selectedChannelBanMut.user &&
				props.selectedChannel.id > 0 &&
				props.selectedChannel.id === props.selectedChannelBanMut.channel)
			{
				if (props.selectedChannelBanMut.ban !== null)
				{
					if (props.selectedChannelBanMut.ban === true)
						reset();
					else
					{
						loading.value = true;
						noError.value = true;
						disableForm.value = false;
						getMessages(props.selectedChannel.id);
					}
				}
				if (props.selectedChannelBanMut.mute !== null)
					disableForm.value = Boolean(props.selectedChannelBanMut.mute);
			}
		}, { deep: true });
		// #endregion

		// #region Incoming message
		socket.on('message::receive::add', (ret) =>
		{
			if (ret.data.channel !== props.selectedChannel.id)
				return;

			const newMessages: messageInterface = {
				user: {
					id: ret.data.data.creator.id,
					pseudo: ret.data.data.creator.pseudo,
					avatar: ret.data.data.creator.avatar,
					connected: ret.data.data.creator.connected
				},
				messages: [{
					id: ret.data.data.id,
					content: String(ret.data.data.content),
					timestamp: ret.data.data.timestamp,
					modified: ret.data.data.modified
				}]
			};
			if (messages.value.length > 0 &&
				messages.value[messages.value.length - 1].user.id === ret.data.data.creator.id)
			{
				messages.value[messages.value.length - 1].messages = [
					...messages.value[messages.value.length - 1].messages,
					...newMessages.messages
				];
			}
			else
				messages.value.push(JSON.parse(JSON.stringify(newMessages)));
			getBottomOfChat();
		});
		// #endregion Incoming message

		// #region Edit message
		const editMessage = () =>
		{
			socket.emit('message::get', {
				id: messageEditId.value,
				channel: props.selectedChannel.id
			});
		};

		socket.on('message::receive::get', (ret) =>
		{
			if (ret.socketId === socket.id)
			{
				editor.value = ret.data.content;
				contextmenu.value?.hide();
			}
		});
		// #endregion Edit message

		// #region Update message
		socket.on('message::receive::update', (ret) =>
		{
			if (ret.data.channel !== props.selectedChannel.id)
				return;

			if (!ret.data.data.content.length)
			{
				deleteLocalMessage(ret.data.data.id);
				return;
			}
			for (const block of messages.value)
			{
				for (const i in block.messages)
				{
					if (block.messages[i].id === ret.data.data.id)
					{
						block.messages[i].content = ret.data.data.content;
						return;
					}
				}
			}
		});
		// #endregion Update message

		// #region Delete message(s)
		const deleteMessage = async () =>
		{
			socket.emit('message::delete', {
				id: props.userId,
				channel: props.selectedChannel.id,
				messageId: messageEditId.value,
				message: editor.value,
				length: editor.value.length,
				timestamp: Date.now(),
				hash: await calcHash(editor.value)
			});
			contextmenu.value?.hide();
			messageEditId.value = -1;
		};

		const deleteLocalMessage = (messageId: number) =>
		{
			for (const x in messages.value)
			{
				for (const y in messages.value[x].messages)
				{
					if (messages.value[x].messages[y].id === Number(messageId))
					{
						if (messages.value[x].messages.length === 1)
							messages.value.splice(Number(x), 1);
						else
							messages.value[x].messages.splice(Number(y), 1);
						return;
					}
				}
			}
		};

		socket.on('message::receive::delete', (ret) =>
		{
			if (ret.data.channel === props.selectedChannel.id)
				deleteLocalMessage(ret.data.id);
		});
		// #endregion Delete message(s)

		// #region Delete current channel
		socket.on('channel::receive::delete', (ret) =>
		{
			if (ret && ret.deleted === true && ret.id === props.selectedChannel.id)
				reset();
		});
		// #endregion Delete current channel

		const openContextualMenu = (e: Event) =>
		{
			let target = e.target as HTMLElement;
			if (!target || (target && target.classList.contains('message-list')))
			{
				contextmenu.value?.hide();
				return;
			}
			while (!target.classList.contains('q-message-text'))
			{
				if (target.classList.contains('q-message-container'))
					break;
				target = target.parentNode as HTMLElement;
			}
			if (contextmenu.value)
			{
				contextmenu.value.updatePosition();
				if (!target.classList.contains('q-message-text--sent'))
					contextmenu.value.hide();
				else
				{
					contextmenu.value.show();
					let dataId: string;
					const getDataId = (list: HTMLCollection) =>
					{
						if (!list.length || dataId)
							return;
						for (let i = 0; i < list.length; i++)
						{
							if (list[i].hasAttribute('data-id') && !dataId)
							{
								const ret = list[i].getAttribute('data-id');
								if (ret)
								{
									dataId = ret;
									messageEditId.value = Number(ret);
								}
								return;
							}
							if (list[i].children)
								getDataId(list[i].children);
						}
					}; getDataId(target.children);
				}
			}
		};

		// #region Check user mute
		const checkMute = (channel: number) =>
		{
			socket.emit('muted::check', {
				id: 0,
				userId: props.userId,
				channelId: channel,
				until: new Date()
			});
		};
		socket.on('muted::receive::check', (ret) =>
		{
			if (ret && ret.socketId === socket.id)
				disableForm.value = ret.data.isMuted;
		});
		// #endregion

		onMounted(() =>
		{
			if (props.userId > 0)
				socket.emit('blocked::get', props.userId);
			watch(() => props.selectedChannel, () =>
			{
				if (!props.selectedChannel.isDeleted)
				{
					loading.value = true;
					noError.value = true;
					checkMute(props.selectedChannel.id);
					getMessages(props.selectedChannel.id);
				}
				else if (props.selectedChannel.id === -1)
					reset();
			});
			if (props.selectedChannel.id > 0)
			{
				loading.value = true;
				noError.value = true;
				checkMute(props.selectedChannel.id);
				getMessages(props.selectedChannel.id);
			}
			else
				disableForm.value = true;
		});

		return {
			contextmenu,
			chat,
			disableForm,
			loading,
			noError,
			editor,
			messages,
			openContextualMenu,
			imageError,
			handleCtrlEnter,
			sendMessage,
			generateTimestamp,
			editMessage,
			deleteMessage
		};
	}
});
</script>

<style>
	.channel {
		background-color: rgb(230, 230, 230);
		overflow-x: auto;
	}
	.chat {
		display: inline-flex;
		flex-direction: column-reverse;
		height: calc(100vh - 50px) !important;
	}
	.chat .message-list {
		padding: .5em;
		overflow-x: auto;
		z-index: 2;
	}
	.chat-wrap {
		word-wrap: anywhere;
	}
	.q-message-name {
		color: white;
		font-size: small;
	}
	.chat form img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.user {
		background-color: rgb(230, 230, 230);
		overflow-x: auto;
	}
	.emoticon {
		vertical-align: middle;
		height: .75em;
		width: .75em;
	}
	.editor {
		min-height: 10rem;
		max-height: 15em;
		position: relative;
		outline: currentColor none medium;
		overflow-wrap: break-word;
		border: none;
	}
	.q-editor__content {
		min-height: calc(10rem - 32px) !important;
		max-height: calc(15em - 32px) !important;
		overflow-x: auto !important;
	}
</style>
