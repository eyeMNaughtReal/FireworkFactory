<template>
  <div class="firework-loader-container">
    <div class="firework"></div>
    <div class="firework"></div>
    <div class="firework"></div>
  </div>
</template>

<script>
export default {
  name: 'FireworkLoader'
}
</script>

<style scoped>
.firework-loader-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 1rem;
}

.firework {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  animation: firework 1s infinite;
  background: linear-gradient(45deg, #ff0000, #ff7b00, #ffcd1c);
}

.firework:nth-child(2) {
  animation-delay: 0.2s;
  background: linear-gradient(45deg, #ff0000, #ff00ff, #ff7b00);
}

.firework:nth-child(3) {
  animation-delay: 0.4s;
  background: linear-gradient(45deg, #00ff00, #ffcd1c, #ff0000);
}

@keyframes firework {
  0% {
    transform: scale(0);
    opacity: 1;
  }
  50% {
    transform: scale(1);
    opacity: 0.8;
  }
  100% {
    transform: scale(0);
    opacity: 1;
  }
}
</style>
