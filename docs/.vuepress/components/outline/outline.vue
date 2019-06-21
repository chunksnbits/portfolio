<template>
  <div class="outline">
    <div class="outline__section outline__section--contacts">
      <h2>Contact</h2>
      <contacts>
        <contact-option v-for="contact in outline.contact" :key="contact.url" :contact="contact">
        </contact-option>
      </contacts>
    </div>

    <div class="outline__section outline__section--skills">
      <h2>Technologies + Skills</h2>

      <skills>
        <skill v-for="skill in outline.skills" :key="skill.name" :level="skill.level" :category="skill.category">
          {{ skill.name }}
        </skill>
      </skills>
    </div>

    <div class="outline__profile-image">
      <img :src="outline.profileImage">
    </div>
  </div>
</template>

<script>
export default {
  name: 'outline',
  props: ['outline'],
};
</script>

<style lang="scss" scoped>
  @import '../../styles/styles.scss';

  $outline__profile-image-size: rem-size(112px);
  $outline__profile-image-size--mobile: rem-size(192px);

  .outline {
    position: relative;
  }

  .outline__section {
    padding-top: rem-size(52px);
  }

  .outline__section:first-child {
    padding-top: 0;
  }

  .outline__section--name {
    font-weight: 700;
    font-size: rem-size(30px);
    color: var(--root__color--primary);
    padding-top: 0;
    line-height: 1;
  }

  .outline__name {
    border-bottom: 1px solid black;
  }

  .outline__role {
    font-size: rem-size(20px);
    margin-top: 7px;
    font-weight: 500;
  }

  .outline__profile-image {
    position: absolute;
    right: rem-size(10px);
    top: rem-size(100px);
    width: $outline__profile-image-size--mobile;
    height: $outline__profile-image-size--mobile;
    border-radius: $outline__profile-image-size--mobile;
    overflow: hidden;
  }

  .outline__profile-image img {
    object-fit: cover;
    width: $outline__profile-image-size--mobile;
    height: $outline__profile-image-size--mobile;
  }

  @mixin outline__layout--desktop {
    .outline {
      padding: 0 rem-size(20px) rem-size(20px);
    }

    .outline__profile-image {
      position: absolute;
      right: rem-size(0);
      top: -1 * rem-size(57px);
      width: $outline__profile-image-size;
      height: $outline__profile-image-size;
      border-radius: $outline__profile-image-size;
    }

    .outline__profile-image img {
      width: $outline__profile-image-size;
      height: $outline__profile-image-size;
    }
  }

  @include breakpoint-greater('sm') {
    @include outline__layout--desktop;
  }

  @media print {
    @include outline__layout--desktop;
  }
</style>

