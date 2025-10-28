<template>
  <div>
    <nav>
      <router-link to="/token">Token</router-link>
      |
      <router-link to="/nft">NFT</router-link>
      |
      <router-link to="/earning">Earning</router-link>
      |
      <router-link to="/faucet">Faucet</router-link>
      |
      <router-link to="/vault">Vault</router-link>
    </nav>
    <router-view />
  </div>
</template>

<script setup>
// Root component
</script>

<style>
nav {
  padding: 1rem;
}
nav a {
  margin: 0 0.5rem;
  text-decoration: none;
  color: #42b883;
}
nav a.router-link-active {
  font-weight: bold;
}
</style>
