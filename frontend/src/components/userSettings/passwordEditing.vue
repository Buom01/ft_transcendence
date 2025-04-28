<template>
	<q-form
		method="post"
		@submit="passwordSubmit"
	>
		<q-input
			v-model="oldPassword"
			outlined
			:label="capitalize($t('setting.user.currentPassword'))"
			name="password"
			:type="isOldPswd ? 'password' : 'text'"
			class=""
			:rules="[(val) => !!val || capitalize($t('setting.user.fieldRequired'))]"
			ref="inputRef"
		>
			<template v-slot:append>
				<q-icon
					:name="isOldPswd ? 'visibility_off' : 'visibility'"
					class="cursor-pointer"
					@click="isOldPswd = !isOldPswd"
				/>
			</template>
		</q-input>
		<q-input
			v-model="newPassword"
			outlined
			:label="capitalize($t('setting.user.newPassword'))"
			name="password"
			:type="isNewPswd ? 'password' : 'text'"
			class=""
			:rules="[(val) => !!val || capitalize($t('setting.user.fieldRequired'))]"
			ref="inputRef"
		>
			<template v-slot:append>
				<q-icon
					:name="isNewPswd ? 'visibility_off' : 'visibility'"
					class="cursor-pointer"
					@click="isNewPswd = !isNewPswd"
				/>
			</template>
		</q-input>
		<q-btn type="submit" class="q-mt-md" :label="$t('setting.user.update')" />
	</q-form>
</template>

<script lang="ts">
import { ref, inject, defineComponent } from 'vue';
import { Capitalize } from 'src/boot/libs';

export default defineComponent({
	setup ()
	{
		const capitalize: Capitalize = inject('capitalize') as Capitalize;
		const newPassword = ref('');
		const oldPassword = ref('');
		const passwordSubmit = function ()
		{
			// Hello
		};
		return {
			capitalize,
			newPassword,
			oldPassword,
			isOldPswd: ref(true),
			isNewPswd: ref(true),
			passwordSubmit
		};
	}
});
</script>
