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
        <skill v-for="skill in skills" :level="skill.level" :category="skill.category">
          {{ skill.name }}
        </skill>
      </skills>
    </div>
  </div>
</template>

<script>

const sortedCategories = ['frontend', 'tools', 'backend', 'other'];

export default {
  name: 'outline',
  props: ['outline'],
  computed: {
    skills() {
      if (!this.outline.skills) {
        return [];
      }
      return this.outline.skills.sort((skill, other) => {
        if (sortedCategories.indexOf(skill.catagory) !== sortedCategories.indexOf(other.catagory)) {
          return sortedCategories.indexOf(skill.catagory) - sortedCategories.indexOf(skill.catagory);
        }
        other.level - skill.level;
      });
    }
  }
};
</script>

<style lang="scss" scoped>
  @import '../styles/functions.scss';

  $outline__profile-image-size: rem-size(112px);

  .outline {
    position: relative;
    padding: rem-size(34px) rem-size(20px) rem-size(20px);
  }

  .outline__section {
    padding-top: rem-size(40px);
  }

  .outline__profile-image {
    position: absolute;
    right: 0;
    top: 0;
    width: $outline__profile-image-size;
    height: $outline__profile-image-size;
    border-radius: $outline__profile-image-size;
    overflow: hidden;
  }

  .outline__profile-image img {
    object-fit: cover;
    width: $outline__profile-image-size;
    height: $outline__profile-image-size;
  }
</style>

