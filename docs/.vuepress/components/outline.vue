<template>
  <div class="outline">
    <div class="outline__profile-image">
      <img :src="outline.profileImage">
    </div>

    <div class="outline__section outline__section--contacts">
      <h1>Kontakt</h1>
      <contacts>
        <contact-option v-for="contact in outline.contact" :contact="contact"></contact-option>
      </contacts>
    </div>

    <div class="outline__section outline__section--skills">
      <h1>Technologien + Skills</h1>

      <skills>
        <skill v-for="skill in outline.skills" :level="skill.level" :category="skill.category">
          {{ skill.name }}
        </skill>
      </skills>
    </div>
  </div>
</template>

<script>
export default {
  name: 'outline',
  props: ['outline'],
};
</script>

<style>
  :root {
    --outline__profile-image--size: 100px;
  }
</style>

<style lang="scss" scoped>
  .outline {
    position: relative;
    padding: 34px 20px 20px;
  }

  .outline__section {
    padding-top: 40px;
  }

  .outline__profile-image {
    position: absolute;
    right: 0;
    top: 0;
    width: var(--outline__profile-image--size);
    height: var(--outline__profile-image--size);
    border-radius: var(--outline__profile-image--size);
    overflow: hidden;
  }

  .outline__profile-image img {
    object-fit: cover;
    width: var(--outline__profile-image--size);
    height: var(--outline__profile-image--size);
  }
</style>

