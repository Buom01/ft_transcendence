<template>
  <q-list class="row q-ma-md justify-evenly shadow-2 rounded-borders bg-white">
    <q-toolbar class="row justify-evenly q-my-lg">
      <profileHeader :user="user"></profileHeader>
    </q-toolbar>
    <q-list class="column q-mt-md">
      <q-btn class="q-mb-md" :to="{ path: '/play' }" color="primary">{{ capitalize($t('index.buttons.start')) }}</q-btn>
      <q-btn class="q-mb-md" :to="{ path: '/chat' }" color="primary">{{ capitalize($t('index.buttons.chat')) }}</q-btn>
      <q-btn class="q-mb-md" :to="{ path: '/play/list' }" color="primary">{{ capitalize($t('index.buttons.checkoutGame')) }}</q-btn>
    </q-list>
    <q-list class="column q-mt-md">
      <q-btn class="q-mb-md" :to="{ path: '/leaderboard' }" color="primary">{{ capitalize($t('index.buttons.checkoutLeader')) }}</q-btn>
      <q-btn class="q-mb-xs" :to="{ path: '/settings' }" color="primary">{{ capitalize($t('index.buttons.edit')) }}</q-btn>
    </q-list>
		<q-list class="rounded-borders shadow-2 q-my-md scroll" style="width: 300px; height: 300px">
			<q-toolbar>
			<q-toolbar-title :hidden="!hideSearch">{{ capitalize($t('index.friends')) }}</q-toolbar-title>
				<q-input :hidden="hideSearch" ref="input" borderless dense debounce="300" v-model="filter" @update:model-value="onFilterChange" :placeholder="capitalize($t('friend.search'))"/>
				<q-btn flat rounded class="q-ml-auto" icon="search" @click="toggleSearch"/>
				<q-btn flat rounded class="q-ml-auto" icon="open_in_full" :to="{name: 'friends'}"/>
			</q-toolbar>
			<q-item v-for="friend in filteredFriendList" v-bind:key="friend.id" clickable v-ripple @click="onFriendClick(friend.id)" class="q-ma-md q-pa-md rounded-borders shadow-2 row items-center" style="width: 260px">
					<q-avatar>
						<img :src='friend.avatar'>
					</q-avatar>
					<div class="q-ml-md">{{ friend.pseudo }}</div>
			</q-item>
				<div v-if="filteredFriendList.length == 0 && filter" class="text-center q-pa-md q-ma-md shadow-2 rounded-borders">
				<q-icon name="warning" size="1.5rem" class="q-mr-sm"></q-icon>
				{{ capitalize($t('index.noData')) }}
			</div>
			<div v-if="filteredFriendList.length == 0 && !filter" class="text-center q-pa-md q-ma-md shadow-2 rounded-borders">
				<q-icon name="warning" size="1.5rem" class="q-mr-sm"></q-icon>
				{{ capitalize($t('index.noFriends')) }}
			</div>
		</q-list>
	</q-list>

	<q-dialog
		no-esc-dismiss
		no-backdrop-dismiss
		square
		v-model="user.new_user"
	>
		<div class="q-pa-md" style="background-color: white; max-width: 400px;">
			<h5 class="q-ma-md">{{ capitalize($t('setting.profilPictureModal.title')) }}</h5>
			<q-card bordered style='width: 300px;' class="q-ma-md">
				<q-card-section>
					<pseudoEditing :pseudo='user.pseudo' v-on:update:pseudo="user.pseudo = $event"></pseudoEditing>
				</q-card-section>
				<q-separator inset />
				<q-card-section>
					<pictureEditing :avatar='user.avatar'></pictureEditing>
				</q-card-section>
			</q-card>
			<q-btn flat v-close-popup>{{ $t('setting.profilPictureModal.dismiss') }}</q-btn>
		</div>
	</q-dialog>
</template>

<script lang="ts">
import pictureEditing from 'src/components/userSettings/pictureEditing.vue';
import pseudoEditing from 'src/components/userSettings/pseudoEditing.vue';
import profileHeader from 'src/components/profilePage/ProfileHeader.vue';
import { ref, onMounted, inject } from 'vue';
import { Capitalize } from 'src/boot/libs';
import { useRouter } from 'vue-router';
import { AxiosInstance } from 'axios';
import type { catchAxiosType } from 'src/boot/axios';

export default ({
	name: 'WelcomePage',
	components: {
		profileHeader,
		pseudoEditing,
		pictureEditing
	},

	setup ()
	{
		const capitalize: Capitalize = inject('capitalize') as Capitalize;
		const api: AxiosInstance = inject('api') as AxiosInstance;
		const catchAxios = inject('catchAxios') as catchAxiosType;

		const user = ref({});
		const router = useRouter();
		const friendList = ref([]);
		const filteredFriendList = ref([]);
		const hideSearch = ref(true);
		const filter = ref('');
		const input = ref();

		async function fetchUserInfo ()
		{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const res: any = await catchAxios(api.get('/user/me', {}));
			user.value = res.data;
		}
		async function fetchFriendList ()
		{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const res: any = await catchAxios(api.get('/friends/accepted'));
			friendList.value = res.data;
			onFilterChange(filter.value);
		}

		async function onFriendClick (friendId: number)
		{
			router.push('/profile/' + String(friendId));
		}

		async function toggleSearch ()
		{
			hideSearch.value = !hideSearch.value;
			setTimeout(() =>
			{
				input.value.focus();
			}, 100);
		}

		async function onFilterChange (value: string)
		{
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			filteredFriendList.value = friendList.value.filter((friend: any) =>
				(value)
					? friend.pseudo.toLowerCase().includes(value.toLowerCase())
					: friend.pseudo.toLowerCase()
			);
		}

		onMounted(() =>
		{
			fetchUserInfo().then(() =>
			{
				catchAxios(api.get('/user/new'));
			});
			fetchFriendList();
		});

		return {
			capitalize,

			user,
			friendList,
			hideSearch,
			filter,
			filteredFriendList,
			input,

			toggleSearch,
			onFilterChange,
			onFriendClick
		};
	}
});
</script>
