module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19',
      // Optional: configure compiler behavior
      // compilationMode: 'annotation', // Only compile annotated components
    }],
  ],
};

