# Component System Documentation

This document describes the JSX-like template function component system implemented for the project.

## Overview

The component system provides a React-like development experience while using vanilla TypeScript and DOM manipulation. It features:

- **JSX-like syntax** with the `h` helper function
- **Type-safe components** with TypeScript interfaces
- **Base component class** for common functionality
- **Component factory** for dynamic creation
- **Component manager** for lifecycle management

## Core Files

### 1. `IComponent.ts` - Component Interface
Defines the contract that all components must follow:
```typescript
interface IComponent<Props = any> {
  props: Props;
  render(container: HTMLElement): void;
  unrender(): void;
  setProps(next: Partial<Props>): void;
  getProps(): Props;
}
```

### 2. `BaseComponent.ts` - Base Component Class
Abstract base class that provides common functionality:
- Props management
- Render/unrender lifecycle
- Element tracking
- Re-rendering on prop changes

### 3. `createElement.ts` - JSX-like Helper
The `h` function creates DOM elements with React-like syntax:
```typescript
h('div', { className: 'my-class' }, 'Hello World')
```

### 4. `ComponentFactory.ts` - Component Factory
Allows registration and dynamic creation of components:
```typescript
ComponentFactory.register('button', ButtonComponent);
const button = ComponentFactory.create('button', { text: 'Click me' });
```

### 5. `ComponentManager.ts` - Component Manager
Manages multiple component instances with batch operations:
```typescript
const manager = new ComponentManager();
manager.add(component);
manager.renderAll(container);
```

## Usage Examples

### Basic Component Creation

```typescript
// Define props interface
interface MyComponentProps {
  title: string;
  onClick?: () => void;
}

// Create component class
class MyComponent extends BaseComponent<MyComponentProps> {
  createElement(): HTMLElement {
    return h('div',
      { className: 'my-component' },
      h('h2', {}, this.props.title),
      this.props.onClick && h('button', 
        { onClick: this.props.onClick }, 
        'Click me'
      )
    );
  }
}

// Usage
const component = new MyComponent({ 
  title: 'Hello World',
  onClick: () => alert('Clicked!')
});

component.render(document.getElementById('app')!);
```

### Using Component Manager

```typescript
const manager = new ComponentManager();
manager.setContainer(document.getElementById('app')!);

const components = [
  new MyComponent({ title: 'Component 1' }),
  new MyComponent({ title: 'Component 2' })
];

components.forEach(comp => manager.add(comp));
manager.renderAll();

// Update props
manager.updateProps(components[0], { title: 'Updated Title' });

// Clean up
manager.unrenderAll();
```

### Using Component Factory

```typescript
// Register components
ComponentFactory.register('my-component', MyComponent);

// Create instances
const component = ComponentFactory.create('my-component', {
  title: 'Factory Created Component'
});

if (component) {
  component.render(container);
}
```

## Component Lifecycle

1. **Constructor**: Initialize props
2. **createElement()**: Create DOM structure (abstract method)
3. **render()**: Add element to container
4. **setProps()**: Update props and re-render
5. **unrender()**: Remove from DOM and cleanup

## Best Practices

### 1. Component Structure
```typescript
export interface ComponentProps {
  // Define all props with proper types
}

export class Component extends BaseComponent<ComponentProps> {
  createElement(): HTMLElement {
    // Use h() function for JSX-like syntax
    return h('div', { className: 'component' }, 
      // Component content
    );
  }
}
```

### 2. Event Handling
```typescript
h('button', {
  onClick: () => this.handleClick(),
  onMouseOver: () => this.handleHover()
}, 'Button Text')
```

### 3. Conditional Rendering
```typescript
h('div', {},
  this.props.showTitle && h('h1', {}, this.props.title),
  this.props.items.map(item => 
    h('div', { key: item.id }, item.name)
  )
)
```

### 4. Styling
```typescript
h('div', {
  className: 'my-component',
  style: {
    padding: '16px',
    backgroundColor: '#f0f0f0',
    borderRadius: '8px'
  }
})
```

## Advanced Features

### Custom Lifecycle Methods
```typescript
class MyComponent extends BaseComponent<Props> {
  protected onMount?(): void {
    // Called after render
    console.log('Component mounted');
  }

  protected onUnmount?(): void {
    // Called before unrender
    console.log('Component will unmount');
  }
}
```

### Component References
```typescript
// Components have a reference to themselves in the DOM
const element = component.render(container);
const componentRef = (element as ComponentElement)._component;
```

## Migration from Direct DOM Manipulation

### Before:
```typescript
const element = document.createElement('div');
element.className = 'my-component';
element.textContent = 'Hello';
container.appendChild(element);
```

### After:
```typescript
const component = new MyComponent({ message: 'Hello' });
component.render(container);
```

This system provides the benefits of component-based architecture while maintaining the simplicity and performance of vanilla DOM manipulation.
