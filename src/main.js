import { mat4, vec3 } from "wgpu-matrix";
import {
  cubeVertexArray,
  cubeVertexSize,
  cubeUVOffset,
  cubePositionOffset,
  cubeVertexCount
} from "./meshes/cube";
import cubeWGSL from "./shaders/cube.wgsl";
import { ArcballCamera, WASDCamera, cameraSourceInfo } from "./camera";
import { createInputHandler, inputSourceInfo } from "./input";



window.onload = async function () {

  // createInputHandler defined in input.js 
  const inputHandler = createInputHandler(window)

  // The camera types
  const initialCameraPosition = vec3.create(3, 2, 5)
  const cameras = {
    arcball: new ArcballCamera({ position: initialCameraPosition }),
    WASD: new WASDCamera({ position: initialCameraPosition })
  }

  // GUI parameters
  const params = {
    type: "arcball"
    // type: "WASD"
  };

  const myCanvas = document.createElement("canvas");
  document.body.appendChild(myCanvas);
  
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = myCanvas.getContext("webgpu")

  // const devicePixelRatio = window.devicePixelRatio || 1
  // myCanvas.width = myCanvas.clientWidth * devicePixelRatio
  // myCanvas.height = myCanvas.clientHeight * devicePixelRatio
  myCanvas.width = 800;
  myCanvas.height = 800;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat()

  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied"
  })

  // Create a vertex buffer from the cube data.
  const verticesBuffer = device.createBuffer({
    size: cubeVertexArray.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true
  })
  new Float32Array(verticesBuffer.getMappedRange()).set(cubeVertexArray)
  verticesBuffer.unmap()

  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: device.createShaderModule({
        code: cubeWGSL
      }),
      entryPoint: "vertex_main",
      buffers: [
        {
          arrayStride: cubeVertexSize,
          attributes: [
            {
              // position
              shaderLocation: 0,
              offset: cubePositionOffset,
              format: "float32x4"
            },
            {
              // uv
              shaderLocation: 1,
              offset: cubeUVOffset,
              format: "float32x2"
            }
          ]
        }
      ]
    },
    fragment: {
      module: device.createShaderModule({
        code: cubeWGSL
      }),
      entryPoint: "fragment_main",
      targets: [
        {
          format: presentationFormat
        }
      ]
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "back"
    },
    depthStencil: {
      depthWriteEnabled: true,
      depthCompare: "less",
      format: "depth24plus"
    }
  })

  const depthTexture = device.createTexture({
    size: [myCanvas.width, myCanvas.height],
    format: "depth24plus",
    usage: GPUTextureUsage.RENDER_ATTACHMENT
  })

  const uniformBufferSize = 4 * 16 // 4x4 matrix
  const uniformBuffer = device.createBuffer({
    size: uniformBufferSize,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
  })

  // Fetch the image and upload it into a GPUTexture.
  let cubeTexture
  {
	const response = await fetch(
	  new URL('./img/shh.png', import.meta.url).toString()
	);

    const imageBitmap = await createImageBitmap(await response.blob());

    cubeTexture = device.createTexture({
      size: [imageBitmap.width, imageBitmap.height, 1],
      format: "rgba8unorm",
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT
    });

    device.queue.copyExternalImageToTexture(
      { source: imageBitmap },
      { texture: cubeTexture },
      [imageBitmap.width, imageBitmap.height]
    )
  }

  // Create a sampler with linear filtering for smooth interpolation.
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear"
  })

  const uniformBindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      {
        binding: 0,
        resource: {
          buffer: uniformBuffer
        }
      },
      {
        binding: 1,
        resource: sampler
      },
      {
        binding: 2,
        resource: cubeTexture.createView()
      }
    ]
  })

  const renderPassDescriptor = {
    colorAttachments: [
      {
        view: undefined, // Assigned later

        clearValue: { r: 0.5, g: 0.5, b: 0.5, a: 0 }, // background color
        loadOp: "clear",
        storeOp: "store"
      }
    ],
    depthStencilAttachment: {
      view: depthTexture.createView(),

      depthClearValue: 1.0,
      depthLoadOp: "clear",
      depthStoreOp: "store"
    }
  }

  const aspect = myCanvas.width / myCanvas.height
  const projectionMatrix = mat4.perspective((2 * Math.PI) / 5, aspect, 1, 100.0)
  const modelViewProjectionMatrix = mat4.create()

  function getModelViewProjectionMatrix(deltaTime) {
    const camera = cameras[params.type]
    const viewMatrix = camera.update(deltaTime, inputHandler()) // so far, only use of inputHandler in main.js
    console.log(inputHandler())
    mat4.multiply(projectionMatrix, viewMatrix, modelViewProjectionMatrix)
    return modelViewProjectionMatrix
  }

  let lastFrameMS = Date.now()

  function frame() {
    const now = Date.now()
    const deltaTime = (now - lastFrameMS) / 1000
    lastFrameMS = now


    const modelViewProjection = getModelViewProjectionMatrix(deltaTime)
    device.queue.writeBuffer(
      uniformBuffer,
      0,
      modelViewProjection.buffer,
      modelViewProjection.byteOffset,
      modelViewProjection.byteLength
    )
    renderPassDescriptor.colorAttachments[0].view = context
      .getCurrentTexture()
      .createView()

    const commandEncoder = device.createCommandEncoder()
    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
    passEncoder.setPipeline(pipeline)
    passEncoder.setBindGroup(0, uniformBindGroup)
    passEncoder.setVertexBuffer(0, verticesBuffer)
    passEncoder.draw(cubeVertexCount)
    passEncoder.end()
    device.queue.submit([commandEncoder.finish()])

    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}


